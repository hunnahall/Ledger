-- Splits v_inflow_outflow's single `inflow` column into `income` (rows
-- marked is_income) and `other_inflow` (positive, non-income rows) for the
-- Dashboard's Income/Other Inflows cards. `outflow` is dropped — nothing
-- reads it; the Dashboard's outflow figures have always come entirely from
-- v_outflow_by_bucket instead.
drop view v_inflow_outflow;

create view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  date_trunc('month', posted_date)::date as month,
  coalesce(sum(amount) filter (where amount > 0 and is_income), 0) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income), 0) as other_inflow
from transactions
where not is_transfer and not exclude_from_budget
group by user_id, date_trunc('month', posted_date)::date;
