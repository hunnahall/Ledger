-- Adds a "Float" default source, shown on the Sources page's Budget
-- section next to the current budget's linked source (to its right in
-- the 2-column grid). Reserved system type 'float', same idea as
-- 'budget': excluded from the Past Payments/Future Repayments/Funds
-- groupings (groupSourcesByType buckets anything that isn't
-- past_payment/future_repayment/fund into its unused "budget" bucket) so
-- it's rendered explicitly in the Budget section instead — but unlike
-- 'budget' it's still a normal, user-adjustable/pickable source
-- everywhere else (getSourceOptions only excludes type = 'budget').

alter table sources drop constraint sources_type_check;
alter table sources add constraint sources_type_check
  check (type in ('budget', 'past_payment', 'future_repayment', 'fund', 'float'));

insert into sources (user_id, name, type, balance)
select u.id, 'Float', 'float', 0
from auth.users u
where not exists (
  select 1 from sources s where s.user_id = u.id and s.name = 'Float' and s.budget_id is null
);
