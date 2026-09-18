-- pg_advisory_xact_lock's two-argument form is (int, int); hashtextextended
-- returns bigint, so the call in 20260904050141 resolved to nothing and the
-- function raised on every invocation. Use the single-argument bigint form
-- with the key namespaced into the hashed text instead. This file carries
-- the authoritative ensure_month_current body.
create or replace function ensure_month_current_lock_key(p_user_id uuid) returns bigint
language sql
immutable
set search_path = pg_catalog
as $$
  select hashtextextended('ensure_month_current:' || p_user_id::text, 0);
$$;

create or replace function ensure_month_current() returns void
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_month date;
  v_month_ahead boolean;

  v_budget_source_id uuid;
  v_budget_period_start date;
  v_categories_total numeric(12,2);
  v_transactions_net numeric(12,2);
  v_transfers_net numeric(12,2);

  v_row record;
  v_source_type text;
  v_source_name text;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);

  v_sinking_source_id uuid;
  v_sinking_period_start date;
  v_contribution numeric(12,2);
  v_sinking_total numeric(12,2) := 0;

  v_income_source_id uuid;
  v_income_period_start date;
  v_income_balance numeric(12,2);
begin
  if v_user_id is null then
    return;
  end if;

  -- Serializes concurrent rolls for this user only; released at commit.
  perform pg_advisory_xact_lock(ensure_month_current_lock_key(v_user_id));

  v_current_month := user_month_start(v_user_id);
  select month_ahead into v_month_ahead from settings where user_id = v_user_id;

  ----------------------------------------------------------------------
  -- 1. Budget source: reset to this month's allocation.
  --    Skipped entirely while Month Ahead is on -- the income sweep in
  --    step 4 funds the budget instead.
  ----------------------------------------------------------------------
  select id, last_applied_month into v_budget_source_id, v_budget_period_start
  from sources where user_id = v_user_id and type = 'budget'
  for update;

  if v_budget_source_id is not null
     and not coalesce(v_month_ahead, false)
     and v_budget_period_start is distinct from v_current_month then

    select coalesce(sum(monthly_amount), 0) into v_categories_total
    from categories where user_id = v_user_id and archived_at is null;

    select coalesce(sum(amount), 0) into v_transactions_net
    from (
      select amount from transactions
      where user_id = v_user_id and source_id = v_budget_source_id and not is_split
        and date_trunc('month', posted_date)::date = v_current_month
      union all
      select ts.amount from transaction_splits ts
      join transactions t on t.id = ts.transaction_id
      where ts.user_id = v_user_id and ts.source_id = v_budget_source_id
        and date_trunc('month', t.posted_date)::date = v_current_month
    ) combined;

    select coalesce(sum(
      case when transfer_to_source_id = v_budget_source_id then abs(amount) else 0 end
      - case when transfer_from_source_id = v_budget_source_id then abs(amount) else 0 end
    ), 0) into v_transfers_net
    from transactions
    where user_id = v_user_id and is_transfer
      and (transfer_from_source_id = v_budget_source_id or transfer_to_source_id = v_budget_source_id)
      and date_trunc('month', posted_date)::date = v_current_month;

    update sources
    set balance = v_categories_total + v_transactions_net + v_transfers_net,
        last_applied_month = v_current_month
    where id = v_budget_source_id;
  end if;

  ----------------------------------------------------------------------
  -- 2. Source Transfers due this month.
  ----------------------------------------------------------------------
  for v_row in
    select id, user_id, source_id, name, amount
    from source_transfers
    where user_id = v_user_id
      and last_applied_month is distinct from v_current_month
    order by id
  loop
    select type, name, balance into v_source_type, v_source_name, v_old_balance
    from sources where id = v_row.source_id
    for update;

    -- Source Transfer's Source was deleted out from under it; skip rather
    -- than error the whole budget page.
    if v_source_type is null then
      continue;
    end if;

    update sources set balance = balance + v_row.amount
    where id = v_row.source_id
    returning balance into v_new_balance;

    update source_transfers set last_applied_month = v_current_month where id = v_row.id;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_row.user_id,
      'Sources',
      v_source_name || ' balance (Source Transfer: ' || v_row.name || ')',
      v_old_balance::text,
      v_new_balance::text
    );
  end loop;

  ----------------------------------------------------------------------
  -- 3. Sinking Fund: pool this month's contributions.
  ----------------------------------------------------------------------
  select id, last_applied_month into v_sinking_source_id, v_sinking_period_start
  from sources where user_id = v_user_id and type = 'sinking_fund'
  for update;

  if v_sinking_source_id is not null
     and v_sinking_period_start is distinct from v_current_month then
    for v_row in
      select se.id, se.contribution_type, se.amount, se.frequency,
             se.target_amount, se.target_date, se.contributed_to_date
      from sinking_expenses se
      where se.user_id = v_user_id and se.archived_at is null
      order by se.id
    loop
      if v_row.contribution_type = 'goal' then
        v_contribution := greatest(0, v_row.target_amount - v_row.contributed_to_date)
          / greatest(1, (
              extract(year from age(date_trunc('month', v_row.target_date), v_current_month)) * 12
              + extract(month from age(date_trunc('month', v_row.target_date), v_current_month))
            ))::int;
      else
        v_contribution := case v_row.frequency
          when 'quarterly' then v_row.amount / 3
          when 'semiannual' then v_row.amount / 6
          else v_row.amount / 12
        end;
      end if;

      update sinking_expenses
      set contributed_to_date = contributed_to_date + v_contribution
      where id = v_row.id;

      v_sinking_total := v_sinking_total + v_contribution;
    end loop;

    update sources
    set balance = balance + v_sinking_total, last_applied_month = v_current_month
    where id = v_sinking_source_id;
  end if;

  ----------------------------------------------------------------------
  -- 4. Income Fund sweep into the budget source (Month Ahead only).
  --    Must stay after step 1, which resets that same source.
  ----------------------------------------------------------------------
  if coalesce(v_month_ahead, false) and v_budget_source_id is not null then
    select id, last_applied_month, balance
    into v_income_source_id, v_income_period_start, v_income_balance
    from sources where user_id = v_user_id and type = 'income'
    for update;

    if v_income_source_id is not null
       and v_income_period_start is distinct from v_current_month then
      update sources set balance = balance + v_income_balance where id = v_budget_source_id;
      update sources set balance = 0, last_applied_month = v_current_month
      where id = v_income_source_id;
    end if;
  end if;
end;
$$;

revoke execute on function ensure_month_current() from public, anon;
grant execute on function ensure_month_current() to authenticated;
revoke execute on function ensure_month_current_lock_key(uuid) from public, anon;
grant execute on function ensure_month_current_lock_key(uuid) to authenticated;
