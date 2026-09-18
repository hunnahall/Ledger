-- A transfer transaction can optionally name a sending and/or receiving
-- bucket (a source or a fund), independent of the transaction's own
-- account_id/source_id. |amount| moves out of the sending bucket and into
-- the receiving bucket. Implemented as FK columns + an old/new-diffing
-- trigger (mirrors transactions_sync_balance's reverse-old/apply-new
-- shape) so repeated saves of the same transaction — the common case when
-- editing a synced transaction through the UI — stay idempotent rather
-- than re-applying the delta each time.

alter table transactions add column transfer_from_source_id uuid references sources(id) on delete set null;
alter table transactions add column transfer_from_fund_id uuid references funds(id) on delete set null;
alter table transactions add column transfer_to_source_id uuid references sources(id) on delete set null;
alter table transactions add column transfer_to_fund_id uuid references funds(id) on delete set null;

alter table transactions add constraint transactions_transfer_from_single_bucket
  check (transfer_from_source_id is null or transfer_from_fund_id is null);
alter table transactions add constraint transactions_transfer_to_single_bucket
  check (transfer_to_source_id is null or transfer_to_fund_id is null);

create index transactions_transfer_from_source_id_idx on transactions (transfer_from_source_id);
create index transactions_transfer_from_fund_id_idx on transactions (transfer_from_fund_id);
create index transactions_transfer_to_source_id_idx on transactions (transfer_to_source_id);
create index transactions_transfer_to_fund_id_idx on transactions (transfer_to_fund_id);

create or replace function transactions_sync_transfer_balance() returns trigger
language plpgsql as $$
declare
  v_old_delta numeric;
  v_new_delta numeric;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.is_transfer then
    v_old_delta := abs(old.amount);
    if old.transfer_from_source_id is not null then
      update sources set balance = balance + v_old_delta where id = old.transfer_from_source_id;
    elsif old.transfer_from_fund_id is not null then
      update funds set balance = balance + v_old_delta where id = old.transfer_from_fund_id;
    end if;
    if old.transfer_to_source_id is not null then
      update sources set balance = balance - v_old_delta where id = old.transfer_to_source_id;
    elsif old.transfer_to_fund_id is not null then
      update funds set balance = balance - v_old_delta where id = old.transfer_to_fund_id;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.is_transfer then
    v_new_delta := abs(new.amount);
    if new.transfer_from_source_id is not null then
      update sources set balance = balance - v_new_delta where id = new.transfer_from_source_id;
    elsif new.transfer_from_fund_id is not null then
      update funds set balance = balance - v_new_delta where id = new.transfer_from_fund_id;
    end if;
    if new.transfer_to_source_id is not null then
      update sources set balance = balance + v_new_delta where id = new.transfer_to_source_id;
    elsif new.transfer_to_fund_id is not null then
      update funds set balance = balance + v_new_delta where id = new.transfer_to_fund_id;
    end if;
  end if;

  return null;
end;
$$;
alter function transactions_sync_transfer_balance() set search_path = public;

create trigger transactions_sync_transfer_balance_trigger
after insert or update or delete on transactions
for each row execute function transactions_sync_transfer_balance();
