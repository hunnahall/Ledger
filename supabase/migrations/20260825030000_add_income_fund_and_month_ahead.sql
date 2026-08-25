-- Income Fund + "Month Ahead" mode.
--
-- month_ahead (settings, default off) controls two things at once:
--  - off (today's behavior): the current budget's linked source resets to
--    the sum of category monthly_amounts at the start of each month
--    (ensure_budget_source_current, unchanged from before this migration).
--  - on: that reset is skipped entirely. Instead, transactions can be
--    marked is_income, which (in this mode) routes their amount into a
--    single reserved "Income" source instead of wherever they'd normally
--    post, and at the start of each month the whole Income source balance
--    is swept on top of (not replacing) whatever's already in the current
--    budget's linked source.
--
-- is_income itself is independent of the mode — it's a plain label usable
-- for filtering/dashboard purposes even with month_ahead off (see
-- v_inflow_outflow, updated separately). Only the "does it get routed to
-- a dedicated fund" behavior is gated by the setting.

alter table settings add column month_ahead boolean not null default false;

alter table transactions add column is_income boolean not null default false;
alter table transactions add constraint transactions_is_income_amount_chk
  check (not is_income or amount > 0);

-- New reserved source type, same treatment as 'float'/'sinking_fund':
-- excluded from the Past Payments/Future Repayments/Funds groupings
-- (groupSourcesByType's catch-all), rendered explicitly in the Sources
-- page's Budget section instead (conditionally — hidden when month_ahead
-- is off), but still a normal, pickable source everywhere else.
alter table sources drop constraint sources_type_check;
alter table sources add constraint sources_type_check
  check (type in ('budget', 'past_payment', 'future_repayment', 'fund', 'float', 'sinking_fund', 'income'));

insert into sources (user_id, name, type, balance)
select u.id, 'Income', 'income', 0
from auth.users u
where not exists (
  select 1 from sources s where s.user_id = u.id and s.name = 'Income' and s.budget_id is null
);

-- Forces an income-marked transaction's source to the Income source while
-- month_ahead is on (so the existing transactions_sync_balance trigger
-- credits it same as any other source-linked transaction — no separate
-- balance-mutation path needed), and clears it back out if the user
-- un-marks a transaction that was still pointed at Income. Fires on every
-- insert/update, but is a no-op unless is_income (or its transition)
-- actually applies — re-syncing an existing transaction never touches
-- is_income (see sync_bank_transactions below), so OLD.is_income always
-- equals NEW.is_income there and neither branch does anything new.
create or replace function route_income_to_fund() returns trigger
language plpgsql as $$
declare
  v_month_ahead boolean;
  v_income_source_id uuid;
begin
  select month_ahead into v_month_ahead from settings where user_id = new.user_id;
  v_month_ahead := coalesce(v_month_ahead, false);

  if new.is_income and v_month_ahead then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if v_income_source_id is not null then
      new.source_id := v_income_source_id;
    end if;
  elsif tg_op = 'UPDATE' and old.is_income and not new.is_income then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if new.source_id is not distinct from v_income_source_id then
      new.source_id := null;
    end if;
  end if;

  return new;
end;
$$;
alter function route_income_to_fund() set search_path = public;

create trigger transactions_route_income
before insert or update on transactions
for each row execute function route_income_to_fund();

-- Budget source's own reset is skipped entirely while month_ahead is on —
-- the income sweep (ensure_income_fund_current below) funds it instead.
create or replace function ensure_budget_source_current(p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_source_id uuid;
  v_period_start date;
  v_total numeric(12,2);
  v_current_month date := date_trunc('month', now())::date;
  v_user_id uuid;
  v_month_ahead boolean;
begin
  select id, budget_period_start, user_id into v_source_id, v_period_start, v_user_id
  from sources
  where budget_id = p_budget_id and type = 'budget';

  if v_source_id is null then
    return;
  end if;

  select month_ahead into v_month_ahead from settings where user_id = v_user_id;
  if coalesce(v_month_ahead, false) then
    return;
  end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_total
    from categories
    where budget_id = p_budget_id and archived_at is null;

    update sources
    set balance = v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$$;
alter function ensure_budget_source_current(uuid) set search_path = public;

-- Lazy monthly sweep, same pattern as the Sinking Fund / Source Transfers:
-- once per calendar month, add the whole Income source balance on top of
-- the current budget's linked source, then zero Income out. No-ops when
-- month_ahead is off. Uses the Income source's own budget_period_start as
-- its "already applied this month" tracker, same reuse as Sinking Fund.
create or replace function ensure_income_fund_current(p_user_id uuid, p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_income_source_id uuid;
  v_period_start date;
  v_income_balance numeric(12,2);
  v_budget_source_id uuid;
  v_current_month date := date_trunc('month', now())::date;
  v_month_ahead boolean;
begin
  select month_ahead into v_month_ahead from settings where user_id = p_user_id;
  if not coalesce(v_month_ahead, false) then
    return;
  end if;

  select id, budget_period_start, balance into v_income_source_id, v_period_start, v_income_balance
  from sources
  where user_id = p_user_id and type = 'income';

  if v_income_source_id is null or v_period_start is not distinct from v_current_month then
    return;
  end if;

  select id into v_budget_source_id from sources where budget_id = p_budget_id and type = 'budget';
  if v_budget_source_id is null then
    return;
  end if;

  update sources set balance = balance + v_income_balance where id = v_budget_source_id;
  update sources set balance = 0, budget_period_start = v_current_month where id = v_income_source_id;
end;
$$;
alter function ensure_income_fund_current(uuid, uuid) set search_path = public;

-- Replaces the SimpleFin edge function's plain upsert. Supabase-js's
-- upsert() would overwrite every column present in the row payload on
-- conflict, including is_income — clobbering a user's manual "uncheck
-- income" the next time this same transaction gets re-synced (syncs
-- deliberately pull overlapping date ranges every time). category_id/
-- source_id are already excluded from the resync payload for the same
-- reason; is_income needs the same protection but isn't a column the old
-- plain upsert could selectively omit only on the update side, hence this
-- function's explicit on-conflict column list.
create or replace function sync_bank_transactions(p_rows jsonb) returns void
language plpgsql as $$
begin
  insert into transactions (
    user_id, account_id, provider_transaction_id, posted_date, amount,
    description, merchant_normalized, status, is_income
  )
  select
    (r->>'user_id')::uuid,
    (r->>'account_id')::uuid,
    r->>'provider_transaction_id',
    (r->>'posted_date')::date,
    (r->>'amount')::numeric,
    r->>'description',
    r->>'merchant_normalized',
    r->>'status',
    (r->>'amount')::numeric > 0
  from jsonb_array_elements(p_rows) as r
  on conflict (account_id, provider_transaction_id)
  do update set
    posted_date = excluded.posted_date,
    amount = excluded.amount,
    description = excluded.description,
    merchant_normalized = excluded.merchant_normalized,
    status = excluded.status;
end;
$$;
alter function sync_bank_transactions(jsonb) set search_path = public;
revoke execute on function sync_bank_transactions(jsonb) from public, anon, authenticated;
grant execute on function sync_bank_transactions(jsonb) to service_role;
