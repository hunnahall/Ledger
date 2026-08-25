-- Removes the Excluded Categories feature entirely (categories.is_excluded
-- and the trigger that synced it into transactions.exclude_from_budget) —
-- reverses 20260825151850_add_excluded_categories.sql. No longer wanted.

drop trigger transactions_sync_excluded_category on transactions;
drop function sync_exclude_from_budget_with_category();
alter table categories drop constraint categories_excluded_zero_amount;
alter table categories drop column is_excluded;
