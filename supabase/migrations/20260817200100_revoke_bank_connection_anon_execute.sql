-- Supabase's default privileges grant EXECUTE directly to anon and
-- authenticated on every new function in `public`, independent of the
-- PUBLIC pseudo-role — revoking from PUBLIC alone (as the prior migration
-- did) doesn't remove the separate anon grant. These two functions should
-- only ever be called by a signed-in user.
revoke execute on function store_bank_connection_secret(text) from anon;
revoke execute on function delete_bank_connection(uuid) from anon;
