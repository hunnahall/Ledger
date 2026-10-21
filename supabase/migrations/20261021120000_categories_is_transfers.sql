-- The Transfers category used to be found by its name, so renaming it silently
-- broke the Dashboard and Budget page override that gives it the Sinking
-- Expenses plus Source Transfers total as its budget. A flag on the row
-- replaces the name match. One flagged category per user at a time.
alter table public.categories add column is_transfers boolean not null default false;

update public.categories set is_transfers = true where name = 'Transfers' and archived_at is null;

create unique index categories_one_transfers_per_user
  on public.categories (user_id)
  where is_transfers and archived_at is null;
