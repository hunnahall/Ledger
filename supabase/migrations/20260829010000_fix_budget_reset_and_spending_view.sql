-- 1. ensure_budget_source_current previously did a blind reset
--    (balance = sum(categories.monthly_amount)) on month rollover, which
--    discarded the effect of any transaction/transfer already posted
--    against the budget source with a posted_date inside the target month
--    (transactions_sync_balance / transactions_sync_transfer_balance apply
--    immediately on insert regardless of posted_date, so a transfer dated
--    next month, entered today, already moves the budget source's balance
--    today -- then got silently wiped out when next month's reset ran).
--    Replace the blind reset with a full re-derivation: this month's
--    allocation plus the net effect of everything already posted into this
--    month against the budget source. Idempotent -- re-running for the same
--    month (guarded by last_applied_month) is a no-op, and anything posted
--    after the reset still applies live via the existing triggers on top of
--    this baseline. No fix needed when Month Ahead is on: that path never
--    resets (the running balance persists permanently), so pre-dated
--    transfers already apply once, correctly, with no wipe.
create or replace function ensure_budget_source_current(p_user_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source_id uuid;
  v_period_start date;
  v_categories_total numeric(12,2);
  v_transactions_net numeric(12,2);
  v_transfers_net numeric(12,2);
  v_current_month date := date_trunc('month', now())::date;
  v_month_ahead boolean;
begin
  select id, last_applied_month into v_source_id, v_period_start
  from sources where user_id = p_user_id and type = 'budget';
  if v_source_id is null then return; end if;

  select month_ahead into v_month_ahead from settings where user_id = p_user_id;
  if coalesce(v_month_ahead, false) then return; end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_categories_total
    from categories where user_id = p_user_id and archived_at is null;

    -- Mirrors transactions_sync_balance / transaction_splits_sync_balance
    -- exactly: no exclude_from_budget filter, since money that already
    -- moved has already moved regardless of budget-reporting exclusion.
    select coalesce(sum(amount), 0) into v_transactions_net
    from (
      select amount from transactions
      where user_id = p_user_id and source_id = v_source_id and not is_split
        and date_trunc('month', posted_date)::date = v_current_month
      union all
      select ts.amount from transaction_splits ts
      join transactions t on t.id = ts.transaction_id
      where ts.user_id = p_user_id and ts.source_id = v_source_id
        and date_trunc('month', t.posted_date)::date = v_current_month
    ) combined;

    -- Mirrors transactions_sync_transfer_balance's abs(amount) math.
    select coalesce(sum(
      case when transfer_to_source_id = v_source_id then abs(amount) else 0 end
      - case when transfer_from_source_id = v_source_id then abs(amount) else 0 end
    ), 0) into v_transfers_net
    from transactions
    where user_id = p_user_id and is_transfer
      and (transfer_from_source_id = v_source_id or transfer_to_source_id = v_source_id)
      and date_trunc('month', posted_date)::date = v_current_month;

    update sources
    set balance = v_categories_total + v_transactions_net + v_transfers_net,
        last_applied_month = v_current_month
    where id = v_source_id;
  end if;
end;
$function$;

-- 2. A category's "spent" total previously counted every transaction
--    tagged with that category regardless of which Source (if any) paid
--    for it -- so a reimbursement-funded or fund-funded purchase counted
--    against the Budget's category totals the same as a Budget-funded one.
--    Scope it to only the reserved Budget-type source, matching how
--    v_outflow_by_bucket already separates "budget" vs "other" spend.
create or replace view v_spending_by_category
with (security_invoker = on) as
select user_id, month, category_id, sum(amount) as amount
from (
  select t.user_id, date_trunc('month', t.posted_date)::date as month, t.category_id, t.amount
  from transactions t
  join sources s on s.id = t.source_id
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split
    and t.category_id is not null and s.type = 'budget'
  union all
  select ts.user_id, date_trunc('month', t.posted_date)::date as month, ts.category_id, ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  join sources s on s.id = ts.source_id
  where not t.is_transfer and not t.exclude_from_budget and ts.category_id is not null
    and s.type = 'budget'
) combined
group by user_id, month, category_id;
