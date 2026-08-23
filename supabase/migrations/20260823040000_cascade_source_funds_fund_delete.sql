-- Every other link in the user -> ... -> row ownership chain cascades (see
-- e.g. sources_user_id_fkey, funds_user_id_fkey), so deleting a user tears
-- down everything they own in one shot. This one relationship was the sole
-- exception: source_funds.fund_id used ON DELETE RESTRICT, which blocks
-- Postgres from cascading a fund's deletion while a source_funds row still
-- references it. Deleting a user cascades into both funds (via funds'
-- own user_id) and source_funds (via source_funds' own user_id) at once,
-- and Postgres doesn't guarantee cascades resolve in an order that clears
-- source_funds before the RESTRICT check on funds fires — so a user with a
-- fund-linked source could fail to delete entirely (surfaced by Supabase
-- Auth as an opaque "Database error deleting user", confirmed by
-- reproducing the failure directly against this constraint).
--
-- Nothing in the app ever hard-deletes a fund directly (archiveFund only
-- sets archived_at), so RESTRICT was never actually protecting anything
-- the UI does — switching to CASCADE just makes this link consistent with
-- every other one in the chain.
alter table source_funds drop constraint source_funds_fund_id_fkey;
alter table source_funds add constraint source_funds_fund_id_fkey
  foreign key (fund_id) references funds(id) on delete cascade;
