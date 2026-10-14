-- Income is a Source. Marking a transaction Income — from the Source select,
-- bulk edit, a vendor rule, manual entry or bank sync's default — always
-- tracks it to the system Income source, whether Month Ahead is on or off.
-- What happens to that money at the start of a new month is the Month Ahead
-- switch:
--   * on  — the Income source's balance is swept into Budget (unchanged);
--   * off — the Income source simply starts the new month at 0.
-- Previously income only reached the Income source when Month Ahead was on
-- and the transaction was dated in the current month; everything else was
-- left with no source at all.

-- 1. Routing trigger: Income <=> the Income source, both directions.
create or replace function route_income_to_fund()
returns trigger
language plpgsql
set search_path to 'public'
as $fn$
declare
  v_income_source_id uuid;
begin
  if new.is_transfer or new.is_split then
    return new;
  end if;

  select id into v_income_source_id
  from sources where user_id = new.user_id and type = 'income';
  if v_income_source_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_income and not new.is_income then
    -- Un-marking Income: leave the Income source too, unless the same edit
    -- picked a different source.
    if new.source_id is not distinct from v_income_source_id then
      new.source_id := null;
    end if;
  elsif new.is_income then
    new.source_id := v_income_source_id;
  elsif new.source_id = v_income_source_id and new.amount > 0
        and not new.exclude_from_budget then
    -- Picking the Income source is marking Income.
    new.is_income := true;
    new.category_id := null;
    new.category_source := null;
  end if;

  return new;
end;
$fn$;

-- 2. Month roll-forward: only the Income section changes. With Month Ahead
-- off the Income source now resets to 0 each month instead of being left
-- alone (it used to receive nothing while Month Ahead was off).
create or replace function ensure_month_current()
returns void
language plpgsql
set search_path to 'public'
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_current_month date;
  v_month_ahead boolean;

  v_budget_source_id uuid;
  v_budget_source_name text;
  v_budget_period_start date;
  v_budget_old_balance numeric(12,2);
  v_categories_total numeric(12,2);
  v_transactions_net numeric(12,2);
  v_transfers_net numeric(12,2);

  v_row record;
  v_source_type text;
  v_source_name text;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);

  v_sinking_source_id uuid;
  v_sinking_source_name text;
  v_sinking_period_start date;
  v_contribution numeric(12,2);
  v_sinking_total numeric(12,2) := 0;

  v_income_source_id uuid;
  v_income_source_name text;
  v_income_period_start date;
  v_income_balance numeric(12,2);
begin
  if v_user_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(ensure_month_current_lock_key(v_user_id));

  v_current_month := user_month_start(v_user_id);
  select month_ahead into v_month_ahead from settings where user_id = v_user_id;

  select id, name, last_applied_month, balance
  into v_budget_source_id, v_budget_source_name, v_budget_period_start, v_budget_old_balance
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
    where id = v_budget_source_id
    returning balance into v_new_balance;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_user_id,
      'Sources',
      v_budget_source_name || ' balance (monthly budget reset)',
      log_money(v_budget_old_balance),
      log_money(v_new_balance)
    );
  end if;

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
      log_money(v_old_balance),
      log_money(v_new_balance)
    );
  end loop;

  select id, name, last_applied_month, balance
  into v_sinking_source_id, v_sinking_source_name, v_sinking_period_start, v_old_balance
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
    where id = v_sinking_source_id
    returning balance into v_new_balance;

    if v_sinking_total <> 0 then
      insert into activity_log (user_id, page, variable, old_value, new_value)
      values (
        v_user_id,
        'Sources',
        v_sinking_source_name || ' balance (monthly contributions)',
        log_money(v_old_balance),
        log_money(v_new_balance)
      );
    end if;
  end if;

  select id, name, last_applied_month, balance
  into v_income_source_id, v_income_source_name, v_income_period_start, v_income_balance
  from sources where user_id = v_user_id and type = 'income'
  for update;

  if v_income_source_id is not null
     and v_income_period_start is distinct from v_current_month then
    if coalesce(v_month_ahead, false) and v_budget_source_id is not null then
      -- Month Ahead on: last month's income becomes this month's budget.
      update sources set balance = balance + v_income_balance where id = v_budget_source_id
      returning balance - v_income_balance, balance into v_old_balance, v_new_balance;
      update sources set balance = 0, last_applied_month = v_current_month
      where id = v_income_source_id;

      if v_income_balance <> 0 then
        insert into activity_log (user_id, page, variable, old_value, new_value)
        values
          (
            v_user_id,
            'Sources',
            v_budget_source_name || ' balance (swept from ' || v_income_source_name || ')',
            log_money(v_old_balance),
            log_money(v_new_balance)
          ),
          (
            v_user_id,
            'Sources',
            v_income_source_name || ' balance (swept to ' || v_budget_source_name || ')',
            log_money(v_income_balance),
            log_money(0)
          );
      end if;
    else
      -- Month Ahead off: income is spent as it arrives; the new month starts at 0.
      update sources set balance = 0, last_applied_month = v_current_month
      where id = v_income_source_id;

      if v_income_balance <> 0 then
        insert into activity_log (user_id, page, variable, old_value, new_value)
        values (
          v_user_id,
          'Sources',
          v_income_source_name || ' balance (new month reset)',
          log_money(v_income_balance),
          log_money(0)
        );
      end if;
    end if;
  end if;
end;
$fn$;

-- 3. Inflows: every counted inflow now has a source (Income included), so
-- "no source, not counted" applies uniformly with no Income exemption.
create or replace view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  month,
  coalesce(sum(amount) filter (where amount > 0 and is_income and source_id is not null), 0::numeric) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income and source_id is not null), 0::numeric) as other_inflow
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    t.amount,
    t.is_income,
    t.source_id
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split

  union all

  select
    ts.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    ts.amount,
    t.is_income,
    ts.source_id
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget
) combined
group by user_id, month;

-- 4. Backfill existing rows without moving any balance. app.purging makes the
-- balance triggers skip (the same transaction-local switch
-- purge_expired_data uses): this income was never credited to the Income
-- source, and crediting it now would sweep it into Budget a second time.
select set_config('app.purging', 'on', true);

-- Income with no source -> the Income source (the routing trigger sets it).
update transactions
set source_id = null
where is_income and source_id is null and not is_transfer and not is_split;

-- "Income" that was really money into another source (manual entry's
-- Add to Source) -> an ordinary inflow to that source, which it already is.
update transactions t
set is_income = false
from sources s
where s.id = t.source_id and t.is_income and s.type <> 'income'
  and not t.is_transfer and not t.is_split;

select set_config('app.purging', 'off', true);
