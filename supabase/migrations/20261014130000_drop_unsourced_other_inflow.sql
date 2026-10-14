-- Unsourced money is not counted on either side. v_outflow_by_bucket already
-- dropped negative amounts with no source (`where source_type is not null`);
-- other_inflow now drops positive non-Income amounts with no source too, so
-- cashFlow nets like against like. Income is exempt: marking a row Income is
-- itself the Source choice (the Source select's Income sentinel clears
-- source_id), so requiring a source_id would zero out income entirely.
create or replace view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  month,
  coalesce(sum(amount) filter (where amount > 0 and is_income), 0::numeric) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income and source_id is not null), 0::numeric) as other_inflow
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    t.amount,
    t.is_income,
    t.source_id
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split

  union all

  select
    ts.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    ts.amount,
    t.is_income,
    ts.source_id
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget
) combined
group by user_id, month;
