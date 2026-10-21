-- The Income source's balance is calculated: this month's Income
-- transactions added up, nothing else. Before, it was a running total that
-- manual edits, the month-start sweep and the 9-transfer cleanup could knock
-- away from "Income received" (Hunter's read $1,197.76 against $5,440.89 on
-- 2026-10-21).
--
-- * income_month_total(source, month_start): the sum.
-- * transactions_sync_balance leaves Income sources alone, then recomputes
--   them from the rows, so every path (sync, edit, rule, split) agrees.
-- * ensure_month_current still sweeps last month's Income into Budget on
--   Advanced and does not on Rolling. The amount swept is read from the
--   transactions (not the stored balance), then the balance is recomputed
--   for the new month.
-- * Existing Income balances are reset to this month's total.

create or replace function public.income_month_total(p_source_id uuid, p_month_start date)
returns numeric
language sql
stable
set search_path to 'public'
as $$
  select coalesce(sum(amount), 0)::numeric(12,2)
  from transactions
  where source_id = p_source_id
    and not is_split
    and posted_date >= p_month_start;
$$;

create or replace function public.transactions_sync_balance() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ids uuid[] := '{}';
begin
  -- Set only by purge_expired_data (transaction-local). Aged-out history
  -- being deleted must not rewind the current balance.
  if current_setting('app.purging', true) = 'on' then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.source_id is not null then
    v_ids := v_ids || old.source_id;
    if not old.is_split and old.amount <> 0 then
      update sources set balance = balance - old.amount
      where id = old.source_id and type <> 'income';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.source_id is not null then
    v_ids := v_ids || new.source_id;
    if not new.is_split and new.amount <> 0 then
      update sources set balance = balance + new.amount
      where id = new.source_id and type <> 'income';
    end if;
  end if;

  -- Income sources are calculated, not accumulated.
  update sources s
  set balance = income_month_total(s.id, user_month_start(s.user_id))
  where s.id = any (v_ids) and s.type = 'income';

  return null;
end;
$$;

create or replace function public.ensure_month_current()
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_current_month date;
  v_advanced boolean;

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
  v_swept numeric(12,2);

  v_allocation numeric(12,2);
begin
  if v_user_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(ensure_month_current_lock_key(v_user_id));

  v_current_month := user_month_start(v_user_id);
  select budget_type = 'advanced' into v_advanced from settings where user_id = v_user_id;

  select id, name, last_applied_month, balance
  into v_budget_source_id, v_budget_source_name, v_budget_period_start, v_budget_old_balance
  from sources where user_id = v_user_id and type = 'budget'
  for update;

  if v_budget_source_id is not null
     and not coalesce(v_advanced, false)
     and v_budget_period_start is distinct from v_current_month then

    select coalesce(sum(monthly_amount), 0) into v_categories_total
    from categories where user_id = v_user_id and archived_at is null;

    -- Split originals are left out; their pieces are plain rows.
    select coalesce(sum(amount), 0) into v_transactions_net
    from transactions
    where user_id = v_user_id and source_id = v_budget_source_id and not is_split
      and date_trunc('month', posted_date)::date = v_current_month;

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
    -- The Income balance is always the current month's Income. Whatever
    -- came in since the last roll-forward (last month, or longer if the app
    -- wasn't opened) is what's left to sweep.
    select coalesce(sum(amount), 0) into v_swept
    from transactions
    where source_id = v_income_source_id
      and not is_split
      and posted_date >= coalesce(v_income_period_start, (v_current_month - interval '1 month')::date)
      and posted_date < v_current_month;

    if coalesce(v_advanced, false) and v_budget_source_id is not null then
      -- Advanced: last month's income becomes this month's budget.
      update sources set balance = balance + v_swept where id = v_budget_source_id
      returning balance - v_swept, balance into v_old_balance, v_new_balance;

      if v_swept <> 0 then
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
            log_money(v_swept),
            log_money(income_month_total(v_income_source_id, v_current_month))
          );
      end if;
    elsif v_swept <> 0 then
      -- Rolling: nothing sweeps; the new month just starts counting again.
      insert into activity_log (user_id, page, variable, old_value, new_value)
      values (
        v_user_id,
        'Sources',
        v_income_source_name || ' balance (new month reset)',
        log_money(v_swept),
        log_money(income_month_total(v_income_source_id, v_current_month))
      );
    end if;

    update sources
    set balance = income_month_total(v_income_source_id, v_current_month),
        last_applied_month = v_current_month
    where id = v_income_source_id;
  end if;

  -- Save this month's allocation once.
  if not exists (
    select 1 from monthly_totals
    where user_id = v_user_id and month = v_current_month and kind = 'allocation'
  ) then
    select
      coalesce((select sum(monthly_amount) from categories
                where user_id = v_user_id and archived_at is null), 0)
      + coalesce((
          select sum(
            case
              when se.contribution_type = 'goal' then
                greatest(0, se.target_amount - se.contributed_to_date)
                / greatest(1,
                    (extract(year from se.target_date)::int - extract(year from v_current_month)::int) * 12
                    + (extract(month from se.target_date)::int - extract(month from v_current_month)::int))
              when se.frequency = 'quarterly' then se.amount / 3
              when se.frequency = 'semiannual' then se.amount / 6
              else se.amount / 12
            end)
          from sinking_expenses se
          where se.user_id = v_user_id and se.archived_at is null), 0)
      + coalesce((select sum(amount) from source_transfers where user_id = v_user_id), 0)
    into v_allocation;

    insert into monthly_totals (user_id, month, kind, amount)
    values (v_user_id, v_current_month, 'allocation', v_allocation)
    on conflict (user_id, month, kind, ref_id) do nothing;
  end if;
end;
$function$;

update sources s
set balance = income_month_total(s.id, user_month_start(s.user_id))
where s.type = 'income'
  and s.balance <> income_month_total(s.id, user_month_start(s.user_id));
