-- A vendor rule's target used to always be a real category. Rules can now
-- also mark a merchant as Income instead (mirroring the INCOME sentinel in
-- the Category select on the Transactions table) — category_id becomes
-- optional, is_income says which target applies, and the check constraint
-- keeps exactly one of the two set (never both, never neither).
alter table vendor_category_rules alter column category_id drop not null;
alter table vendor_category_rules add column is_income boolean not null default false;
alter table vendor_category_rules
  add constraint vendor_category_rules_target_check
  check ((category_id is not null) <> is_income);
