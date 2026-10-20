-- Retention: keep 4 full calendar months of transactions and log (was 3
-- months and 60 days), and keep monthly totals that outlive the rows behind
-- them so history-based views can reach back further.
--
-- monthly_totals.kind:
--   category_spent  spent in a Category that month (ref_id = category id)
--   source_spent    gross spending out of a Source that month (ref_id = source id)
--   allocation      the Budget's allocation for that month (no ref_id)
-- Amounts are positive magnitudes. ref_name keeps the name the item had, so a
-- later rename or delete doesn't blank old history.

create table monthly_totals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  kind text not null check (kind in ('category_spent', 'source_spent', 'allocation')),
  ref_id uuid,
  ref_name text,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'allocation') = (ref_id is null)),
  unique nulls not distinct (user_id, month, kind, ref_id)
);

alter table monthly_totals enable row level security;
create policy "own rows" on monthly_totals for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger monthly_totals_set_updated_at
  before update on monthly_totals
  for each row execute function set_updated_at();

-- Purge: save spent totals for the months about to be deleted, then delete.
-- Writing them in the same step means edits made while a month was still
-- inside the window are included. Allocation is not written here; it is saved
-- when the month starts (ensure_month_current), because category and sinking
-- amounts only store today's values.
create or replace function public.purge_expired_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cutoff date := date_trunc('month', current_date) - interval '4 months';
begin
  perform set_config('app.purging', 'on', true);

  insert into monthly_totals (user_id, month, kind, ref_id, ref_name, amount)
  select v.user_id, v.month, 'category_spent', v.category_id, c.name, -v.amount
  from v_spending_by_category v
  join categories c on c.id = v.category_id
  where v.month < cutoff
  on conflict (user_id, month, kind, ref_id)
  do update set amount = excluded.amount, ref_name = excluded.ref_name;

  insert into monthly_totals (user_id, month, kind, ref_id, ref_name, amount)
  select g.user_id, g.month, 'source_spent', g.source_id, s.name, -sum(g.amount)
  from (
    select t.user_id, date_trunc('month', t.posted_date)::date as month, t.source_id, t.amount
    from transactions t
    where not t.is_transfer and not t.exclude_from_budget and not t.is_split
      and t.amount < 0 and t.source_id is not null and t.posted_date < cutoff
    union all
    select ts.user_id, date_trunc('month', t.posted_date)::date, ts.source_id, ts.amount
    from transaction_splits ts
    join transactions t on t.id = ts.transaction_id
    where not t.is_transfer and not t.exclude_from_budget
      and ts.amount < 0 and ts.source_id is not null and t.posted_date < cutoff
  ) g
  join sources s on s.id = g.source_id
  group by g.user_id, g.month, g.source_id, s.name
  on conflict (user_id, month, kind, ref_id)
  do update set amount = excluded.amount, ref_name = excluded.ref_name;

  delete from transactions where posted_date < cutoff;
  delete from activity_log where created_at < cutoff::timestamptz;

  perform set_config('app.purging', 'off', true);
end;
$function$;

-- Allocation snapshot: ensure_month_current saves the month's allocation the
-- first time the app is opened that month. Allocation = active categories'
-- monthly amounts + each active sinking expense's monthly amount + source
-- transfers: the same figure the app computes (getSinkingAndTransferMonthlyTotal
-- plus categories). ON CONFLICT DO NOTHING, so a month is only ever written once.
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
    if coalesce(v_advanced, false) and v_budget_source_id is not null then
      -- Advanced: last month's income becomes this month's budget.
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
      -- Rolling: income is spent as it arrives; the new month starts at 0.
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
