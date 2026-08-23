-- Activity log: a record of manual admin-style changes made outside the
-- Transactions page (budgets/categories/sinking expenses/source transfers,
-- sources/funds, manual accounts) — Transactions already has its own
-- record in the transaction row itself, so nothing there writes here.
-- Insert-only, no update trigger.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page text not null,
  variable text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index activity_log_user_id_created_at_idx on activity_log (user_id, created_at desc);

alter table activity_log enable row level security;
create policy "own rows" on activity_log for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Source Transfers: a defined recurring transfer into an existing Source,
-- counted toward the budget total like a sinking expense. No archived_at —
-- Delete hard-deletes, matching how deleteCategory/deleteSinkingExpense
-- actually behave despite their own tables having that column.
create table source_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  last_applied_month date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index source_transfers_budget_id_idx on source_transfers (budget_id);
create index source_transfers_user_id_idx on source_transfers (user_id);
create index source_transfers_source_id_idx on source_transfers (source_id);

alter table source_transfers enable row level security;
create policy "own rows" on source_transfers for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger source_transfers_set_updated_at before update on source_transfers
  for each row execute function set_updated_at();

-- Lazy monthly apply, same pattern as ensure_budget_source_current: no real
-- cron, just a check-on-view that catches up whenever this budget's page is
-- next loaded. Credits each active Source Transfer's amount to its Source
-- once per calendar month and logs the balance change.
create or replace function ensure_source_transfers_current(p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_row record;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_source_name text;
  v_current_month date := date_trunc('month', now())::date;
begin
  for v_row in
    select id, user_id, source_id, name, amount
    from source_transfers
    where budget_id = p_budget_id
      and (last_applied_month is distinct from v_current_month)
  loop
    select balance, name into v_old_balance, v_source_name
    from sources where id = v_row.source_id;

    if v_old_balance is null then
      -- Source Transfer's Source was deleted out from under it; skip
      -- rather than error the whole budget page.
      continue;
    end if;

    update sources set balance = balance + v_row.amount
    where id = v_row.source_id
    returning balance into v_new_balance;

    update source_transfers set last_applied_month = v_current_month
    where id = v_row.id;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_row.user_id,
      'Sources',
      v_source_name || ' balance (Source Transfer: ' || v_row.name || ')',
      v_old_balance::text,
      v_new_balance::text
    );
  end loop;
end;
$$;
alter function ensure_source_transfers_current(uuid) set search_path = public;
