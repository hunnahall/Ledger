-- Powers the Dashboard's "Spending By Source" tile (formerly "Balances",
-- which showed each Source's running balance) -- how much moved out of
-- each Source this month. Same is_transfer/exclude_from_budget/is_split
-- shape as v_outflow_by_bucket, grouped by source_id instead of
-- budget-vs-other bucket, and not restricted to a single source type.
create or replace view v_spending_by_source
with (security_invoker = on) as
select user_id, month, source_id, sum(amount) as amount
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date)::date as month,
    t.source_id,
    t.amount
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split
    and t.amount < 0 and t.source_id is not null
  union all
  select
    ts.user_id,
    date_trunc('month', t.posted_date)::date as month,
    ts.source_id,
    ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget and ts.amount < 0
    and ts.source_id is not null
) combined
group by user_id, month, source_id;
