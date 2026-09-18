-- Teller discontinued its developer tier before any integration shipped.
-- Replaces the Teller-shaped columns on accounts/transactions with a
-- provider-agnostic bank_connections model built for SimpleFin: one
-- connection (one SimpleFin access URL) can cover many accounts, unlike
-- Teller's one-access-token-per-institution model. The access URL is real
-- bank credential material, so it's stored in Supabase Vault (encrypted),
-- never in a plain column.

create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'simplefin' check (provider = 'simplefin'),
  access_url_secret_id uuid not null,
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bank_connections_user_id_idx on bank_connections (user_id);

alter table bank_connections enable row level security;
create policy "own rows" on bank_connections for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger bank_connections_set_updated_at before update on bank_connections
  for each row execute function set_updated_at();

drop index if exists accounts_teller_account_unique;
alter table accounts
  drop column teller_enrollment_id,
  drop column teller_access_token_encrypted;
alter table accounts rename column teller_account_id to provider_account_id;
alter table accounts add column bank_connection_id uuid references bank_connections(id) on delete cascade;
create unique index accounts_provider_account_unique on accounts (bank_connection_id, provider_account_id)
  where provider_account_id is not null;

drop index if exists transactions_account_teller_id_unique;
alter table transactions rename column teller_transaction_id to provider_transaction_id;
create unique index transactions_account_provider_id_unique on transactions (account_id, provider_transaction_id)
  where provider_transaction_id is not null;

alter table sync_log add column bank_connection_id uuid references bank_connections(id) on delete cascade;
alter table sync_log alter column account_id drop not null;

-- Vault-backed access: authenticated users may create/delete their own
-- connection's secret (auth.uid() is read from the caller's JWT even
-- inside a SECURITY DEFINER function, so this stays correctly scoped);
-- only service_role (the sync Edge Function) may ever read a decrypted
-- access URL back out.

create or replace function store_bank_connection_secret(p_access_url text)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_connection_id uuid;
begin
  v_secret_id := vault.create_secret(p_access_url, 'bank-connection-' || gen_random_uuid()::text);
  insert into bank_connections (user_id, access_url_secret_id)
  values (auth.uid(), v_secret_id)
  returning id into v_connection_id;
  return v_connection_id;
end;
$$;
revoke execute on function store_bank_connection_secret(text) from public;
grant execute on function store_bank_connection_secret(text) to authenticated;

create or replace function get_bank_connection_access_url(p_connection_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_url text;
begin
  select access_url_secret_id into v_secret_id from bank_connections where id = p_connection_id;
  if v_secret_id is null then
    return null;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where id = v_secret_id;
  return v_url;
end;
$$;
revoke execute on function get_bank_connection_access_url(uuid) from public, anon, authenticated;
grant execute on function get_bank_connection_access_url(uuid) to service_role;

create or replace function delete_bank_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select access_url_secret_id into v_secret_id
  from bank_connections
  where id = p_connection_id and user_id = auth.uid();

  if v_secret_id is null then
    raise exception 'bank connection not found';
  end if;

  delete from vault.secrets where id = v_secret_id;
  delete from bank_connections where id = p_connection_id;
end;
$$;
revoke execute on function delete_bank_connection(uuid) from public;
grant execute on function delete_bank_connection(uuid) to authenticated;
