-- The prior migration revoked EXECUTE from the named anon/authenticated
-- roles, but Postgres grants EXECUTE to PUBLIC by default and those roles
-- inherit through that grant. Revoke from PUBLIC directly so handle_new_user
-- is only reachable via its auth.users trigger, not the RPC endpoint.
revoke execute on function handle_new_user() from public;
