-- Forecasts: a saved "what-if" projection for one Source — reads sources
-- and source_transfers but never writes to them. monthly_transfer_override
-- is a forecast-local stand-in for a real recurring Source Transfer, used
-- ONLY when the chosen source has no row in source_transfers; when one
-- exists, the live source_transfers.amount always wins (computed at read
-- time, never copied in here) so a forecast can't drift from the real
-- Budgets-page config.
create table forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_id uuid not null references sources(id) on delete cascade,
  monthly_transfer_override numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forecasts_user_id_idx on forecasts (user_id);
create index forecasts_source_id_idx on forecasts (source_id);

alter table forecasts enable row level security;
create policy "own rows" on forecasts for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger forecasts_set_updated_at before update on forecasts
  for each row execute function set_updated_at();

-- Forecast entries: manual one-off adjustments to a forecast's projected
-- balance. month is stored first-of-month (YYYY-MM-01), matching the app's
-- existing date-as-string convention (see currentMonthISO/lib/dates.ts).
-- amount is always a positive magnitude; is_expense picks the sign at
-- read/compute time, mirroring the Expense/Deposit type-toggle pattern
-- used on the Transactions page rather than a signed amount column.
create table forecast_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_id uuid not null references forecasts(id) on delete cascade,
  month date not null,
  description text not null,
  is_expense boolean not null default true,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forecast_entries_forecast_id_idx on forecast_entries (forecast_id);
create index forecast_entries_user_id_idx on forecast_entries (user_id);

alter table forecast_entries enable row level security;
create policy "own rows" on forecast_entries for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger forecast_entries_set_updated_at before update on forecast_entries
  for each row execute function set_updated_at();
