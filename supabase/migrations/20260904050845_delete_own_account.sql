-- Self-serve account deletion. Everything in public.* is FK'd to
-- auth.users(id) on delete cascade, so removing the auth row removes the
-- whole tenant. Scoped to auth.uid() so it can only ever delete the caller.
create or replace function delete_own_account() returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Frees the invite so the same address could be re-invited later.
  delete from signup_allowlist
  where lower(email) = lower((select email from auth.users where id = v_user_id));

  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;
