-- learnVendorRule looked up an existing rule by (user_id, merchant_normalized)
-- and then chose insert vs. update in two separate statements, which could
-- race under concurrent categorization (e.g. two SimpleFin transactions for
-- the same merchant syncing at once) and leave duplicate rule rows for the
-- same user's merchant. No such duplicates exist today, but add the
-- constraint so it can't happen going forward.

alter table vendor_category_rules
  add constraint vendor_category_rules_user_merchant_key unique (user_id, merchant_normalized);
