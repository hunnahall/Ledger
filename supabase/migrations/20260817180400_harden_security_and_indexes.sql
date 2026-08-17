-- Address advisor findings: pin function search_path, lock down
-- handle_new_user to the auth trigger only, add missing FK-covering
-- indexes, and wrap auth.uid() in RLS policies so it's evaluated once
-- per query instead of once per row.

alter function set_updated_at() set search_path = public;
alter function enforce_budget_limit() set search_path = public;
alter function check_split_sum() set search_path = public;
alter function handle_new_user() set search_path = public;

revoke execute on function handle_new_user() from anon, authenticated;

create index transactions_category_id_idx on transactions (category_id);
create index transactions_source_id_idx on transactions (source_id);
create index transaction_splits_category_id_idx on transaction_splits (category_id);
create index transaction_splits_source_id_idx on transaction_splits (source_id);
create index vendor_category_rules_category_id_idx on vendor_category_rules (category_id);
create index vendor_category_rules_source_id_idx on vendor_category_rules (source_id);

drop policy "own rows" on accounts;
drop policy "own rows" on budgets;
drop policy "own rows" on categories;
drop policy "own rows" on category_periods;
drop policy "own rows" on sources;
drop policy "own rows" on source_contributions;
drop policy "own rows" on transactions;
drop policy "own rows" on transaction_splits;
drop policy "own rows" on vendor_category_rules;
drop policy "own rows" on sync_log;
drop policy "own rows" on settings;

create policy "own rows" on accounts for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on budgets for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on categories for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on category_periods for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on sources for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on source_contributions for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on transactions for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on transaction_splits for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on vendor_category_rules for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on sync_log for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on settings for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
