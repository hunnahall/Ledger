-- A transfer is recorded twice (Hunter's call, 2026-10-21).
--
-- Before this: mark_transfer flagged the original is_transfer, which every
-- dashboard figure leaves out, so the money leaving showed up nowhere as
-- spending. Now the original stays an ordinary outflow on the Budget source
-- under the Transfers category (it counts as Expense against the Allocation,
-- which already includes Source Transfers), and the copy on the destination
-- Source stays a transfer row, so it moves that Source's balance and shows in
-- its popup but never counts as Income or Other inflows.
--
-- A copy only lives while its original is still a negative, Budget-sourced
-- transaction in the Transfers category. Change any of that and the copy goes
-- (the balance trigger takes its amount back off the Source). While it holds,
-- a change to the original's amount, date, description or status follows onto
-- the copy.

drop trigger if exists transactions_drop_transfer_copy on public.transactions;
drop function if exists public.transactions_drop_transfer_copy();

create or replace function public.transactions_sync_transfer_copy()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_holds boolean;
begin
  if not exists (select 1 from transactions where transfer_of = new.id) then
    return null;
  end if;

  v_holds := new.amount < 0
    and not new.is_transfer
    and not new.exclude_from_budget
    and not new.is_split
    and not new.is_income
    and exists (select 1 from categories c where c.id = new.category_id and c.is_transfers)
    and exists (select 1 from sources s where s.id = new.source_id and s.type = 'budget');

  if v_holds then
    update transactions
    set amount = abs(new.amount), posted_date = new.posted_date,
        description = new.description, status = new.status
    where transfer_of = new.id
      and (amount, posted_date, description, status)
        is distinct from (abs(new.amount), new.posted_date, new.description, new.status);
  else
    delete from transactions where transfer_of = new.id;
  end if;
  return null;
end;
$function$;

create trigger transactions_sync_transfer_copy
after update of amount, posted_date, description, status, source_id, category_id,
  exclude_from_budget, is_transfer, is_income, is_split
on public.transactions
for each row when (old.transfer_of is null)
execute function public.transactions_sync_transfer_copy();

-- Marks a negative transaction as a transfer to a Source: it becomes a Budget
-- expense in the Transfers category, and a copy with the absolute amount is
-- booked to the Source. Calling it again moves the copy to a new Source.
create or replace function public.mark_transfer(p_transaction_id uuid, p_source_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_txn transactions%rowtype;
  v_budget_id uuid;
  v_category_id uuid;
  v_dest_type source_type;
begin
  select * into v_txn from transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'Transaction not found.';
  end if;
  if v_txn.is_split then
    raise exception 'Transfer one of the pieces instead: a split original can''t be a transfer.';
  end if;
  if v_txn.transfer_of is not null then
    raise exception 'This row is the copy of a transfer.';
  end if;
  if v_txn.amount >= 0 then
    raise exception 'Only money going out can be a transfer to a Source.';
  end if;

  select type into v_dest_type from sources
  where id = p_source_id and user_id = v_txn.user_id and archived_at is null;
  if not found then
    raise exception 'Source not found.';
  end if;
  if v_dest_type in ('budget', 'income') then
    raise exception 'Pick a Source other than the Budget or Income.';
  end if;

  select id into v_budget_id from sources where user_id = v_txn.user_id and type = 'budget';
  select id into v_category_id from categories
  where user_id = v_txn.user_id and is_transfers and archived_at is null;
  if v_budget_id is null then
    raise exception 'No Budget source found.';
  end if;
  if v_category_id is null then
    raise exception 'Flag a Transfers category on the Budget page first.';
  end if;

  delete from transactions where transfer_of = p_transaction_id;

  update transactions
  set is_transfer = false, exclude_from_budget = false, is_income = false,
      source_id = v_budget_id, category_id = v_category_id, category_source = 'manual'
  where id = p_transaction_id;

  insert into transactions (
    user_id, account_id, posted_date, description, amount, status,
    source_id, is_transfer, transfer_of
  ) values (
    v_txn.user_id, null, v_txn.posted_date, v_txn.description, abs(v_txn.amount), v_txn.status,
    p_source_id, true, p_transaction_id
  );
end;
$function$;

revoke all on function public.mark_transfer(uuid, uuid) from public, anon;
grant execute on function public.mark_transfer(uuid, uuid) to authenticated;
