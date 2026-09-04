-- Collapses ensure_budget_source_current / ensure_source_transfers_current
-- / ensure_sinking_fund_current / ensure_income_fund_current into one RPC.
--
-- Three problems with the old shape:
--
-- 1. Each took an arbitrary `p_user_id` and was EXECUTE-able by anon as
--    well as authenticated. RLS made them inert for anyone else's id, but
--    a function that decides which user to act on from a client-supplied
--    argument is the wrong shape. auth.uid() now decides.
--
-- 2. The income-fund and sinking-fund sweeps read a balance with
--    `select ... into` and then `update ... set balance = balance + <that>`
--    with no lock. Two concurrent callers -- trivially the Dashboard and
--    Budget pages loading together, since both call this -- could both pass
--    the last_applied_month guard and double-credit the month.
--    20260823030000_atomic_balance_adjustments.sql fixed exactly this bug
--    class for adjust_source_balance; the fix was never applied here. A
--    per-user advisory lock held for the transaction now serializes the
--    whole roll, so all four steps are one atomic, idempotent unit.
--
-- 3. The month came from date_trunc('month', now()) -- UTC. It now comes
--    from the user's settings.timezone (see 20260904050104).
--
-- Step order is load-bearing and unchanged: the budget source is reset
-- first, transfers and sinking contributions credit their own sources, and
-- the income sweep runs last because it adds into the budget source the
-- first step just reset.
--
-- NOTE: the ensure_month_current body below is superseded in full by
-- 20260904050400_fix_ensure_month_current_advisory_lock.sql, which fixes
-- the pg_advisory_xact_lock overload resolution. Kept here as the
-- historical record of the consolidation itself.

create or replace function user_month_start(p_user_id uuid) returns date
language sql
stable
set search_path = public
as $$
  select date_trunc(
    'month',
    now() at time zone coalesce(
      (select timezone from settings where user_id = p_user_id),
      'UTC'
    )
  )::date;
$$;

revoke execute on function user_month_start(uuid) from public, anon, authenticated;

drop function if exists ensure_budget_source_current(uuid);
drop function if exists ensure_income_fund_current(uuid);
drop function if exists ensure_sinking_fund_current(uuid);
drop function if exists ensure_source_transfers_current(uuid);
