-- Backs the Dashboard's new Budgeted Outflow / Other Outflow split.
-- Structured exactly like v_spending_by_category (union of non-split
-- transactions + splits, same is_transfer/exclude_from_budget filters):
-- a transaction's outflow counts as 'budget' when its source is
-- type='budget' or has no source at all (the implicit default bucket),
-- otherwise 'other' (past_payment/future_repayment/fund).
create view v_outflow_by_bucket
with (security_invoker = on) as
select
  user_id,
  month,
  case when coalesce(source_type, 'budget') = 'budget' then 'budget' else 'other' end as bucket,
  sum(amount) as amount
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date)::date as month,
    s.type as source_type,
    t.amount
  from transactions t
  left join sources s on s.id = t.source_id
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split and t.amount < 0
  union all
  select
    ts.user_id,
    date_trunc('month', t.posted_date)::date as month,
    s.type as source_type,
    ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  left join sources s on s.id = ts.source_id
  where not t.is_transfer and not t.exclude_from_budget and ts.amount < 0
) combined
group by user_id, month, case when coalesce(source_type, 'budget') = 'budget' then 'budget' else 'other' end;
