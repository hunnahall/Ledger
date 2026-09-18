-- Support tables: vendor_category_rules (auto-categorization memory),
-- sync_log (Teller poll audit trail), settings (per-user preferences).

create table vendor_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_normalized text not null,
  category_id uuid not null references categories(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  last_used_at timestamptz not null default now(),
  use_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vendor_category_rules_user_merchant_unique on vendor_category_rules (user_id, merchant_normalized);

create table sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  triggered_by text not null check (triggered_by in ('cron', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  transactions_fetched int,
  transactions_new int,
  error_message text
);
create index sync_log_user_id_idx on sync_log (user_id);
create index sync_log_account_id_idx on sync_log (account_id);

create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  decimal_places smallint not null default 2 check (decimal_places between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
