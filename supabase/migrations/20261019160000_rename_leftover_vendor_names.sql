-- Names left over from earlier approaches. The table became `rules` on
-- 2026-10-19 but kept its vendor_category_rules_* constraint, index and
-- trigger names, and Income routing is still named after the Income Fund
-- that became the Income source. Renames only; nothing refers to these
-- names (checked: no function body, no app code).
alter table rules rename constraint vendor_category_rules_pkey to rules_pkey;
alter table rules rename constraint vendor_category_rules_user_id_fkey to rules_user_id_fkey;
alter table rules rename constraint vendor_category_rules_category_id_fkey to rules_category_id_fkey;
alter table rules rename constraint vendor_category_rules_source_id_fkey to rules_source_id_fkey;
alter table rules rename constraint vendor_category_rules_target_check to rules_target_check;
alter index vendor_category_rules_user_merchant_unique rename to rules_user_merchant_unique;
alter index vendor_category_rules_category_id_idx rename to rules_category_id_idx;
alter index vendor_category_rules_source_id_idx rename to rules_source_id_idx;
alter trigger vendor_category_rules_set_updated_at on rules rename to rules_set_updated_at;
alter trigger vendor_category_rules_assert_same_user on rules rename to rules_assert_same_user;
alter function route_income_to_fund() rename to route_income_to_source;
