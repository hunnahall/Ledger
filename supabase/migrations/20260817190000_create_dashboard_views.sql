-- Dashboard aggregation views. security_invoker = on is required so each
-- view enforces the querying user's RLS policies rather than the view
-- owner's (which would otherwise bypass RLS entirely).

create view v_spending_by_category
with (security_invoker = on) as
select user_id, month, category_id, sum(amount) as amount
from (
  select t.user_id, date_trunc('month', t.posted_date)::date as month, t.category_id, t.amount
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split and t.category_id is not null
  union all
  select ts.user_id, date_trunc('month', t.posted_date)::date as month, ts.category_id, ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget and ts.category_id is not null
) combined
group by user_id, month, category_id;

create view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  date_trunc('month', posted_date)::date as month,
  coalesce(sum(amount) filter (where amount > 0), 0) as inflow,
  coalesce(sum(amount) filter (where amount < 0), 0) as outflow
from transactions
where not is_transfer and not exclude_from_budget
group by user_id, date_trunc('month', posted_date)::date;

create view v_account_balances
with (security_invoker = on) as
select id, user_id, account_name, account_type, current_balance, available_balance, status
from accounts;

create view v_source_balances
with (security_invoker = on) as
select
  s.id,
  s.user_id,
  s.name,
  s.type,
  s.is_reimbursement,
  s.balance,
  s.balance + coalesce(sum(sc.amount) filter (where sc.pulled_forward), 0) as available_balance
from sources s
left join source_contributions sc on sc.source_id = s.id
where s.archived_at is null
group by s.id, s.user_id, s.name, s.type, s.is_reimbursement, s.balance;

create view v_float_outstanding
with (security_invoker = on) as
select user_id, sum(balance) as float_outstanding
from sources
where is_reimbursement and balance < 0 and archived_at is null
group by user_id;

create view v_reimbursements_pending
with (security_invoker = on) as
select id, user_id, name, balance
from sources
where is_reimbursement and balance <> 0 and archived_at is null;
