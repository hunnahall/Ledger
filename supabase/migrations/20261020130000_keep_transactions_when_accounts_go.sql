-- Deleting an account or disconnecting a bank no longer takes transactions
-- with it (Hunter's call, 2026-10-20). Both used to cascade: disconnecting
-- deleted the bank's accounts, which deleted their transactions, and the
-- balance trigger then took every one of those amounts back off its Source.
--
-- Now a disconnected bank's accounts stay, marked disconnected and detached
-- from the connection, and a deleted account's transactions stay with no
-- account. Source balances don't move either way. Reconnecting the same bank
-- reattaches its old accounts by SimpleFin's account id (simplefin-sync), so
-- a re-sync doesn't duplicate their transactions.

alter table public.accounts drop constraint accounts_bank_connection_id_fkey;
alter table public.accounts
  add constraint accounts_bank_connection_id_fkey
  foreign key (bank_connection_id) references public.bank_connections(id) on delete set null;

alter table public.transactions alter column account_id drop not null;
alter table public.transactions drop constraint transactions_account_id_fkey;
alter table public.transactions
  add constraint transactions_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete set null;

create or replace function public.delete_bank_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'vault'
as $function$
declare
  v_secret_id uuid;
begin
  select access_url_secret_id into v_secret_id
  from bank_connections
  where id = p_connection_id and user_id = auth.uid();

  if v_secret_id is null then
    raise exception 'bank connection not found';
  end if;

  -- The accounts and their transactions stay; only the link goes.
  update accounts set status = 'disconnected'
  where bank_connection_id = p_connection_id and user_id = auth.uid();

  delete from vault.secrets where id = v_secret_id;
  delete from bank_connections where id = p_connection_id;
end;
$function$;
