-- v_spending_by_source previously counted outflows only (amount < 0), so a
-- reimbursement/refund/income posted to a Source didn't reduce that
-- Source's spend total the way v_spending_by_category already lets a
-- category-tagged refund reduce a category's total (it has no such sign
-- filter). Drop the sign restriction here too: sum every non-transfer,
-- non-excluded transaction/split tied to the Source, so money coming back
-- into it nets against what went out, same as Category already does.
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
    and t.source_id is not null
  union all
  select
    ts.user_id,
    date_trunc('month', t.posted_date)::date as month,
    ts.source_id,
    ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget
    and ts.source_id is not null
) combined
group by user_id, month, source_id;
