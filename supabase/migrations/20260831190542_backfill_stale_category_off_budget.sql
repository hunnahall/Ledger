-- Before 6d79693 ("gate Category on Source=Budget"), changing a
-- transaction's Source away from the reserved Budget source only hid the
-- Category select -- it never cleared the row's category_id underneath.
-- Those rows are invisible in the Transactions table (gated by source) and
-- excluded from v_spending_by_category's totals (scoped to s.type =
-- 'budget'), but a category_id with no source, or one whose source isn't
-- Budget, still leaked into the Dashboard category tile's transaction
-- popup (see the fix to getDashboardTileTransactions in the same commit as
-- this migration). Null out the stale value so the data matches the
-- invariant the app now enforces on every edit.
update transactions t
set category_id = null,
    category_source = null
from sources s
where t.source_id = s.id
  and t.category_id is not null
  and s.type <> 'budget';

update transactions t
set category_id = null,
    category_source = null
where t.source_id is null
  and t.category_id is not null;
