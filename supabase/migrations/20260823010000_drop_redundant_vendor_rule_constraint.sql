-- vendor_category_rules already had a unique index on (user_id,
-- merchant_normalized) since the original schema
-- (vendor_category_rules_user_merchant_unique, in
-- 20260817180100_create_support_tables.sql). The previous migration added a
-- second, redundant one under a different name without checking for the
-- existing one first — drop it.

alter table vendor_category_rules
  drop constraint vendor_category_rules_user_merchant_key;
