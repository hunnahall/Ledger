-- 1. Backfill balance/archived_at from the linked fund onto its owning
--    source row before dropping the fund table (a fund-type source's own
--    balance/archived_at columns are dead today — getSourcesWithBalance
--    always preferred the linked fund's values).
update sources s
set balance = f.balance,
    archived_at = coalesce(s.archived_at, f.archived_at)
from source_funds sf
join funds f on f.id = sf.fund_id
where sf.source_id = s.id;

-- 2. Re-point fund-space transfer references onto the equivalent source
--    id before the join table that connects them is dropped.
update transactions t
set transfer_from_source_id = sf.source_id
from source_funds sf
where t.transfer_from_fund_id = sf.fund_id;

update transactions t
set transfer_to_source_id = sf.source_id
from source_funds sf
where t.transfer_to_fund_id = sf.fund_id;

alter table transactions drop constraint if exists transactions_transfer_from_single_bucket;
alter table transactions drop constraint if exists transactions_transfer_to_single_bucket;
drop index if exists transactions_transfer_from_fund_id_idx;
drop index if exists transactions_transfer_to_fund_id_idx;
alter table transactions drop column transfer_from_fund_id;
alter table transactions drop column transfer_to_fund_id;

-- 3. Drop views/functions that touch funds/source_funds so the tables can
--    be dropped, then drop the tables themselves.
drop view v_source_balances;
drop function if exists archive_fund(uuid);
drop function if exists adjust_fund_balance(uuid, numeric);
drop function if exists adjust_source_balance(uuid, numeric);

drop table source_funds;
drop table funds;

-- 4. Simplify the shared balance-sync function now that "fund or source"
--    collapses to just "source".
create or replace function sync_source_or_fund_balance(p_source_id uuid, p_delta numeric)
returns void language plpgsql as $$
begin
  if p_source_id is null or p_delta = 0 then return; end if;
  update sources set balance = balance + p_delta where id = p_source_id;
end;
$$;
alter function sync_source_or_fund_balance(uuid, numeric) set search_path = public;

-- 5. Recreate v_source_balances without the funds/source_funds join.
create view v_source_balances
with (security_invoker = on) as
select id, user_id, name, type, deposit_date, balance
from sources
where archived_at is null;
