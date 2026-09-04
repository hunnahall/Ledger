-- get_bank_connection_access_url decrypted ANY connection's SimpleFin Vault
-- secret from its id alone, with no ownership check in the body. It is safe
-- today only because EXECUTE is service_role-only -- but it sits one
-- mistaken grant away from letting any user read another user's live bank
-- credentials. Compare delete_bank_connection in the same original
-- migration, which correctly scopes with `and user_id = auth.uid()`.
--
-- auth.uid() is null in the caller (the simplefin-sync edge function runs as
-- service_role), so the owner is passed explicitly. The edge function
-- already holds connection.user_id from the RLS-scoped ownership check it
-- does before calling this.
create or replace function get_bank_connection_access_url(
  p_connection_id uuid,
  p_user_id uuid
) returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_url text;
begin
  select access_url_secret_id into v_secret_id
  from bank_connections
  where id = p_connection_id and user_id = p_user_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where id = v_secret_id;

  return v_url;
end;
$$;

drop function if exists get_bank_connection_access_url(uuid);

revoke execute on function get_bank_connection_access_url(uuid, uuid) from public, anon, authenticated;
grant execute on function get_bank_connection_access_url(uuid, uuid) to service_role;
