-- Turning Month Ahead on only changes behavior going forward — the
-- route_income_to_fund trigger (see 20260825030000) fires on transaction
-- insert/update, not when the setting itself changes. Anything already
-- marked is_income this month from before the mode was on (a bank-synced
-- deposit auto-marked while off, or a manual pick) would otherwise just
-- sit there as a label forever instead of actually landing in the pool
-- that's about to be swept into the budget. This is the one-time catch-up
-- run from updateMonthAhead when the checkbox is turned on.
--
-- Scoped to the current month only — older income shouldn't retroactively
-- get swept into a pool destined for *next* month's budget. Split
-- transactions are excluded: transactions_sync_balance only applies a
-- parent row's own source_id for non-split transactions (splits carry
-- their own source_id per row instead), so re-pointing a split parent's
-- source_id here wouldn't actually credit anything.
create or replace function route_current_month_income_to_fund(p_user_id uuid) returns void
language plpgsql as $$
declare
  v_income_source_id uuid;
  v_month_start date := date_trunc('month', now())::date;
begin
  select id into v_income_source_id from sources where user_id = p_user_id and type = 'income';
  if v_income_source_id is null then
    return;
  end if;

  update transactions
  set source_id = v_income_source_id
  where user_id = p_user_id
    and is_income
    and not is_transfer
    and not is_split
    and posted_date >= v_month_start
    and source_id is distinct from v_income_source_id;
end;
$$;
alter function route_current_month_income_to_fund(uuid) set search_path = public;
