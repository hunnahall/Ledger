-- Replace the old 5 source types (general/current_budget/advance/
-- reimbursement/sinking_fund), is_reimbursement, and the unused
-- source_contributions pull-forward mechanism with 4 explicit types
-- (budget/past_payment/future_repayment/fund), a new funds entity that
-- fund-type sources link to (source_funds, capped at 1 fund per source
-- for now via a unique index), and a trigger that keeps source/fund
-- balances in sync with transactions immediately. No real users exist
-- yet, so this is a clean cutover rather than a data migration.

drop view v_source_balances;
drop view v_float_outstanding;
drop view v_reimbursements_pending;

alter table sources drop constraint sources_type_check;
update sources set type = 'budget';
alter table sources add constraint sources_type_check
  check (type in ('budget', 'past_payment', 'future_repayment', 'fund'));
alter table sources alter column type set default 'budget';
alter table sources drop column is_reimbursement;
alter table sources add column deposit_date date;

drop table source_contributions;

create table funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric(12,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index funds_user_name_unique on funds (user_id, name) where archived_at is null;
create index funds_user_id_idx on funds (user_id);

alter table funds enable row level security;
create policy "own rows" on funds for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger funds_set_updated_at before update on funds
  for each row execute function set_updated_at();

create table source_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete restrict,
  created_at timestamptz not null default now()
);
-- Enforces "exactly one fund per source" at the DB level (multi-fund
-- sources are a future extension; the create-source form still renders
-- a multi-select, but is capped at 1 selection client- and server-side).
create unique index source_funds_source_id_unique on source_funds (source_id);
create index source_funds_fund_id_idx on source_funds (fund_id);
create index source_funds_user_id_idx on source_funds (user_id);

alter table source_funds enable row level security;
create policy "own rows" on source_funds for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Applies a signed delta to a source's balance, or (for fund-type
-- sources) to the fund it's linked to. Plain balance = balance + delta;
-- no separate tracking field. Runs as the invoking user (not security
-- definer) — RLS "own rows" already permits updating one's own
-- sources/funds rows.
create or replace function sync_source_or_fund_balance(p_source_id uuid, p_delta numeric)
returns void
language plpgsql as $$
declare
  v_type text;
  v_fund_id uuid;
begin
  if p_source_id is null or p_delta = 0 then
    return;
  end if;

  select type into v_type from sources where id = p_source_id;
  if v_type is null then
    return;
  end if;

  if v_type = 'fund' then
    select fund_id into v_fund_id from source_funds where source_id = p_source_id;
    if v_fund_id is not null then
      update funds set balance = balance + p_delta where id = v_fund_id;
    end if;
  else
    update sources set balance = balance + p_delta where id = p_source_id;
  end if;
end;
$$;
alter function sync_source_or_fund_balance(uuid, numeric) set search_path = public;

-- A transaction's own source_id/amount only count toward balance when
-- it isn't split (mirrors v_spending_by_category's is_split handling).
create or replace function transactions_sync_balance() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not new.is_split then
      perform sync_source_or_fund_balance(new.source_id, new.amount);
    end if;
  elsif tg_op = 'UPDATE' then
    if not old.is_split then
      perform sync_source_or_fund_balance(old.source_id, -old.amount);
    end if;
    if not new.is_split then
      perform sync_source_or_fund_balance(new.source_id, new.amount);
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_split then
      perform sync_source_or_fund_balance(old.source_id, -old.amount);
    end if;
  end if;
  return null;
end;
$$;
alter function transactions_sync_balance() set search_path = public;

create trigger transactions_sync_balance_trigger
after insert or update or delete on transactions
for each row execute function transactions_sync_balance();

-- Split rows always count individually (they only exist while their
-- parent transaction is split).
create or replace function transaction_splits_sync_balance() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform sync_source_or_fund_balance(new.source_id, new.amount);
  elsif tg_op = 'UPDATE' then
    perform sync_source_or_fund_balance(old.source_id, -old.amount);
    perform sync_source_or_fund_balance(new.source_id, new.amount);
  elsif tg_op = 'DELETE' then
    perform sync_source_or_fund_balance(old.source_id, -old.amount);
  end if;
  return null;
end;
$$;
alter function transaction_splits_sync_balance() set search_path = public;

create trigger transaction_splits_sync_balance_trigger
after insert or update or delete on transaction_splits
for each row execute function transaction_splits_sync_balance();

-- Dashboard views (dropped above since they depended on
-- source_contributions/is_reimbursement) — recreate against the new shape.
create view v_source_balances
with (security_invoker = on) as
select
  s.id,
  s.user_id,
  s.name,
  s.type,
  s.deposit_date,
  coalesce(f.balance, s.balance) as balance
from sources s
left join source_funds sf on sf.source_id = s.id
left join funds f on f.id = sf.fund_id
where s.archived_at is null;

create view v_float_outstanding
with (security_invoker = on) as
select user_id, sum(balance) as float_outstanding
from sources
where type in ('past_payment', 'future_repayment') and balance < 0 and archived_at is null
group by user_id;

create view v_reimbursements_pending
with (security_invoker = on) as
select id, user_id, name, balance, deposit_date
from sources
where type in ('past_payment', 'future_repayment') and balance <> 0 and archived_at is null;
