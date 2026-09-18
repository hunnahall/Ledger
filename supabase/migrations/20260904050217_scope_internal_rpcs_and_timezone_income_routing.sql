-- Income routing: same two fixes as ensure_month_current -- decide the
-- user from auth.uid() rather than a client-supplied argument, and take
-- "this month" from the user's timezone rather than UTC.
create or replace function route_current_month_income_to_fund() returns void
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_income_source_id uuid;
  v_month_start date;
begin
  if v_user_id is null then
    return;
  end if;

  v_month_start := user_month_start(v_user_id);

  select id into v_income_source_id
  from sources where user_id = v_user_id and type = 'income';
  if v_income_source_id is null then
    return;
  end if;

  update transactions
  set source_id = v_income_source_id
  where user_id = v_user_id
    and is_income
    and not is_transfer
    and not is_split
    and posted_date >= v_month_start
    and source_id is distinct from v_income_source_id;
end;
$$;

drop function if exists route_current_month_income_to_fund(uuid);
revoke execute on function route_current_month_income_to_fund() from public, anon;
grant execute on function route_current_month_income_to_fund() to authenticated;

-- The insert/update trigger equivalent: also per-user timezone now, so a
-- transaction posted "today" is judged against the same month boundary the
-- rest of the app uses.
create or replace function route_income_to_fund() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_month_ahead boolean;
  v_income_source_id uuid;
  v_month_start date := user_month_start(new.user_id);
begin
  select month_ahead into v_month_ahead from settings where user_id = new.user_id;
  v_month_ahead := coalesce(v_month_ahead, false);

  if new.is_income and v_month_ahead and new.posted_date >= v_month_start then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if v_income_source_id is not null then
      new.source_id := v_income_source_id;
    end if;
  elsif tg_op = 'UPDATE' and old.is_income and not new.is_income then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if new.source_id is not distinct from v_income_source_id then
      new.source_id := null;
    end if;
  end if;

  return new;
end;
$$;

-- user_month_start is called from SECURITY INVOKER trigger/function bodies
-- that run as the user, so it needs to stay readable by them.
grant execute on function user_month_start(uuid) to authenticated;

-- Trigger-only helper. An authenticated user could previously rpc this
-- directly to set any of their own source balances to an arbitrary value.
-- (Dropped outright in 20260904050257 -- inlined into its two callers.)
revoke execute on function sync_source_or_fund_balance(uuid, numeric) from public, anon, authenticated;

-- Called only by the simplefin-sync edge function as service_role.
revoke execute on function match_transfer_pairs(uuid) from public, anon, authenticated;

-- Supabase platform event-trigger function; flagged by the security advisor
-- as anon-executable. Nothing should call it directly.
revoke execute on function rls_auto_enable() from public, anon, authenticated;
