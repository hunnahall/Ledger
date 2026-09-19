-- Budget Net previously counted only true Income (is_income) against
-- budgeted spending, so a paycheck/reimbursement recorded under a real
-- category on the Budget source (instead of flagged Income) sat invisible
-- to it. Isolates just that: positive-amount, Budget-sourced transactions
-- carrying a category, scoped and structured the same way
-- v_spending_by_category/v_outflow_by_bucket already scope "Budget" money
-- (same is_transfer/exclude_from_budget filters, union of non-split rows
-- and transaction_splits), but summed to one total rather than grouped by
-- category since Budget Net only needs the aggregate.
create view v_budget_category_income
with (security_invoker = on) as
select user_id, month, sum(amount) as amount
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date)::date as month,
    t.amount
  from transactions t
  join sources s on s.id = t.source_id
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split
    and t.category_id is not null and s.type = 'budget' and t.amount > 0
  union all
  select
    ts.user_id,
    date_trunc('month', t.posted_date)::date as month,
    ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  join sources s on s.id = ts.source_id
  where not t.is_transfer and not t.exclude_from_budget and ts.category_id is not null
    and s.type = 'budget' and ts.amount > 0
) combined
group by user_id, month;
