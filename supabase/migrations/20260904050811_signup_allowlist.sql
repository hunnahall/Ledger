-- Invite-only signup. Enforced in the on_auth_user_created trigger rather
-- than in the signUp server action, so it holds even for someone calling
-- the Supabase Auth API directly with the publishable key -- the server
-- action is not the only door.
create table signup_allowlist (
  email text primary key,
  invited_at timestamptz not null default now(),
  used_at timestamptz,
  note text
);

-- RLS on with NO policies: invisible and unwritable through PostgREST for
-- anon and authenticated alike. Only the SECURITY DEFINER trigger below
-- (and the service role / SQL editor) can see it.
alter table signup_allowlist enable row level security;

-- Emails are compared case-insensitively; auth.users stores them lowercased
-- but an invite may be typed in any case.
create unique index signup_allowlist_email_lower_idx on signup_allowlist (lower(email));

-- The existing account predates the allowlist.
insert into signup_allowlist (email, used_at, note)
select email, created_at, 'backfilled: account existed before the allowlist'
from auth.users
on conflict (email) do nothing;

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  select true into v_allowed
  from signup_allowlist
  where lower(email) = lower(new.email)
    and used_at is null
  limit 1;

  if not coalesce(v_allowed, false) then
    raise exception 'Signups are invite only.'
      using errcode = 'insufficient_privilege';
  end if;

  update signup_allowlist set used_at = now() where lower(email) = lower(new.email);

  insert into public.settings (user_id) values (new.id);
  insert into public.sources (user_id, name, type, is_system, balance) values
    (new.id, 'Budget', 'budget', true, 0),
    (new.id, 'Float', 'float', true, 0),
    (new.id, 'Sinking Fund', 'sinking_fund', true, 0),
    (new.id, 'Income', 'income', true, 0);
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;
