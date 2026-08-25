-- A transaction with no Source should count toward neither Budgeted nor
-- Other Outflows — previously coalesce(source_type, 'budget') put sourceless
-- outflows into "Budgeted". With the single-budget-per-user collapse
-- (20260825170200), "budget" bucket = tied to the one budget-type Source —
-- no extra current-budget scoping is needed beyond excluding sourceless rows.
create or replace view v_outflow_by_bucket
with (security_invoker = on) as
select
  user_id,
  month,
  case when source_type = 'budget' then 'budget' else 'other' end as bucket,
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
where source_type is not null
group by user_id, month, case when source_type = 'budget' then 'budget' else 'other' end;
