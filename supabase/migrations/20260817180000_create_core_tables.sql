-- Core tables: accounts, budgets, categories, category_periods, sources,
-- source_contributions, transactions, transaction_splits.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  teller_enrollment_id text,
  teller_account_id text,
  teller_access_token_encrypted text,
  institution_name text,
  account_name text not null,
  account_type text not null default 'manual' check (account_type in ('checking', 'savings', 'credit_card', 'manual')),
  last4 text,
  current_balance numeric(12,2) not null default 0,
  available_balance numeric(12,2),
  is_manual boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_teller_account_unique on accounts (user_id, teller_account_id) where teller_account_id is not null;
create index accounts_user_id_idx on accounts (user_id);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index budgets_one_current_per_user on budgets (user_id) where is_current;
create index budgets_user_id_idx on budgets (user_id);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null,
  monthly_amount numeric(12,2) not null default 0,
  rollover boolean not null default false,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_budget_name_unique on categories (budget_id, name) where archived_at is null;
create index categories_budget_id_idx on categories (budget_id);
create index categories_user_id_idx on categories (user_id);

create table category_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  year_month date not null,
  allowance numeric(12,2) not null default 0,
  spent numeric(12,2) not null default 0,
  carried_forward numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_periods_year_month_first_of_month check (date_trunc('month', year_month) = year_month)
);
create unique index category_periods_category_month_unique on category_periods (category_id, year_month);
create index category_periods_user_id_idx on category_periods (user_id);

create table sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'general' check (type in ('general', 'current_budget', 'advance', 'reimbursement', 'sinking_fund')),
  is_reimbursement boolean not null default false,
  balance numeric(12,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sources_user_name_unique on sources (user_id, name) where archived_at is null;
create index sources_user_id_idx on sources (user_id);

create table source_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  amount numeric(12,2) not null,
  target_month date not null,
  pulled_forward boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_contributions_target_month_first_of_month check (date_trunc('month', target_month) = target_month)
);
create index source_contributions_source_id_idx on source_contributions (source_id);
create index source_contributions_user_id_idx on source_contributions (user_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  teller_transaction_id text,
  posted_date date not null,
  amount numeric(12,2) not null,
  description text not null,
  merchant_normalized text,
  category_id uuid references categories(id) on delete set null,
  source_id uuid references sources(id) on delete set null,
  is_transfer boolean not null default false,
  exclude_from_budget boolean not null default false,
  notes text,
  is_split boolean not null default false,
  status text not null default 'posted' check (status in ('posted', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index transactions_account_teller_id_unique on transactions (account_id, teller_transaction_id) where teller_transaction_id is not null;
create index transactions_user_posted_date_idx on transactions (user_id, posted_date desc);
create index transactions_user_merchant_idx on transactions (user_id, merchant_normalized);

create table transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  source_id uuid references sources(id) on delete set null,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transaction_splits_transaction_id_idx on transaction_splits (transaction_id);
create index transaction_splits_user_id_idx on transaction_splits (user_id);
