-- v_inflow_outflow summed transactions.amount at the parent level only, while
-- v_outflow_by_bucket and v_budget_category_income read split legs
-- (transaction_splits). A split mixing signs (e.g. -$250 groceries + $50
-- reimbursement under a category) then counted the outflow leg but never the
-- inflow leg, so cashFlow disagreed with itself and categorizedIncome could
-- exceed otherInflow. Same shape as v_outflow_by_bucket now: non-split
-- transactions plus every split leg, with a leg inheriting its parent's
-- is_income. Column names, order and types are unchanged.
create or replace view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  month,
  coalesce(sum(amount) filter (where amount > 0 and is_income), 0::numeric) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income), 0::numeric) as other_inflow
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    t.amount,
    t.is_income
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split

  union all

  select
    ts.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    ts.amount,
    t.is_income
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget
) combined
group by user_id, month;
