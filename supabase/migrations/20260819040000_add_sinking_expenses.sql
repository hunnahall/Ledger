-- Sinking expenses: budget items that are paid quarterly, semiannually, or
-- annually, entered as the payment amount + frequency. The monthly amount
-- the user should be setting aside is derived (amount / months-per-period)
-- rather than stored, same spirit as categories.monthly_amount but computed.
-- Creating one auto-provisions a same-named Fund (via a before-insert
-- trigger that fills in fund_id) so the user has somewhere to accumulate
-- the monthly contribution.

create table sinking_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  fund_id uuid references funds(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null default 0,
  frequency text not null default 'annual' check (frequency in ('quarterly', 'semiannual', 'annual')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sinking_expenses_budget_name_unique on sinking_expenses (budget_id, name) where archived_at is null;
create index sinking_expenses_budget_id_idx on sinking_expenses (budget_id);
create index sinking_expenses_user_id_idx on sinking_expenses (user_id);
create index sinking_expenses_fund_id_idx on sinking_expenses (fund_id);

alter table sinking_expenses enable row level security;
create policy "own rows" on sinking_expenses for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger sinking_expenses_set_updated_at before update on sinking_expenses
  for each row execute function set_updated_at();

create or replace function provision_sinking_expense_fund() returns trigger
language plpgsql as $$
begin
  if new.fund_id is null then
    insert into funds (user_id, name, balance)
    values (new.user_id, new.name, 0)
    returning id into new.fund_id;
  end if;
  return new;
end;
$$;
alter function provision_sinking_expense_fund() set search_path = public;

create trigger sinking_expenses_provision_fund
before insert on sinking_expenses
for each row execute function provision_sinking_expense_fund();

-- Fold sinking expenses' derived monthly contribution into the same total
-- that resets the Budget-linked source's balance each month.
create or replace function ensure_budget_source_current(p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_source_id uuid;
  v_period_start date;
  v_total numeric(12,2);
  v_current_month date := date_trunc('month', now())::date;
begin
  select id, budget_period_start into v_source_id, v_period_start
  from sources
  where budget_id = p_budget_id and type = 'budget';

  if v_source_id is null then
    return;
  end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_total
    from categories
    where budget_id = p_budget_id and archived_at is null;

    select v_total + coalesce(sum(
      case frequency
        when 'quarterly' then amount / 3
        when 'semiannual' then amount / 6
        else amount / 12
      end
    ), 0) into v_total
    from sinking_expenses
    where budget_id = p_budget_id and archived_at is null;

    update sources
    set balance = v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$$;
alter function ensure_budget_source_current(uuid) set search_path = public;
