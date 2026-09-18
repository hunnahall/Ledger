-- Merges the 'past_payment' and 'future_repayment' source types into one
-- 'reimbursement' type. Every place that actually computes something
-- (balance/archive/validation logic, v_reimbursements_pending,
-- v_float_outstanding) already treated the two identically — the split was
-- purely cosmetic (two Sources page sections, two label strings). Deposit
-- dates were already unrestricted to past-or-future for both types and
-- remain so — no new constraint added.

-- Drop the constraint before the UPDATE (the old one doesn't allow
-- 'reimbursement' yet) and re-add it after (adding it first would validate
-- against the still-unmigrated 'past_payment'/'future_repayment' rows and
-- fail the same way) — neither order works with the constraint held
-- constant across the UPDATE, so it has to be dropped for the duration.
alter table sources drop constraint sources_type_check;

update sources set type = 'reimbursement' where type in ('past_payment', 'future_repayment');

alter table sources add constraint sources_type_check
  check (type in ('budget', 'reimbursement', 'fund', 'float', 'sinking_fund', 'income'));

create or replace view v_reimbursements_pending
with (security_invoker = on) as
select id, user_id, name, balance, deposit_date
from sources
where type = 'reimbursement' and balance <> 0 and archived_at is null;

create or replace view v_float_outstanding
with (security_invoker = on) as
select user_id, sum(balance) as float_outstanding
from sources
where type = 'reimbursement' and balance < 0 and archived_at is null
group by user_id;
