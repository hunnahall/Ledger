-- Row Level Security: every table is scoped to its owning user.

alter table accounts enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;
alter table category_periods enable row level security;
alter table sources enable row level security;
alter table source_contributions enable row level security;
alter table transactions enable row level security;
alter table transaction_splits enable row level security;
alter table vendor_category_rules enable row level security;
alter table sync_log enable row level security;
alter table settings enable row level security;

create policy "own rows" on accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on category_periods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on sources for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on source_contributions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on transaction_splits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on vendor_category_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on sync_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
