-- The Budget-linked source's balance should equal the sum of its
-- budget's category monthly_amounts at the start of each month, then
-- draw down as transactions post against it (same trigger-driven
-- decrement as any other source) for the rest of the month. No rollover
-- of leftover/negative balance between months, consistent with the
-- earlier decision to remove category rollover entirely.
--
-- Implemented as a lazy reset rather than a cron job: budget_period_start
-- records which month a source's balance currently reflects.
-- ensure_budget_source_current() is called from getCurrentBudget()
-- (lib/queries/budgets.ts) — the single choke point every page that
-- displays this balance already goes through — and is a no-op once
-- already reset for the current month.

alter table sources add column budget_period_start date;

create or replace function ensure_budget_source_current(p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_source_id uuid;
  v_period_start date;
  v_total numeric(12,2);
  v_current_month date := date_trunc('month', now())::date;
begin
  select id, budget_period_start into v_source_id, v_period_start
  from sources
  where budget_id = p_budget_id and type = 'budget';

  if v_source_id is null then
    return;
  end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_total
    from categories
    where budget_id = p_budget_id and archived_at is null;

    update sources
    set balance = v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$$;
alter function ensure_budget_source_current(uuid) set search_path = public;

-- One-time backfill: bring existing budget-linked sources up to date now
-- (added on top of whatever balance already reflects transactions/
-- adjustments made against them so far, same as a reset would have).
update sources s
set balance = s.balance + coalesce((
  select sum(c.monthly_amount) from categories c
  where c.budget_id = s.budget_id and c.archived_at is null
), 0),
budget_period_start = date_trunc('month', now())::date
where s.budget_id is not null;
