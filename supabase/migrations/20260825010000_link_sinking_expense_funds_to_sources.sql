-- Bug fix: a sinking expense auto-provisions a Fund (funds row) to
-- accumulate its monthly contribution, but that Fund was never linked to
-- a Source — and the Sources page's Funds section (and every source
-- picker: manual transactions, Source Transfers) is driven entirely by
-- fund-type Sources (see getSourcesWithBalance/getSourceOptions), not
-- the funds table directly. So sinking-expense funds were provisioned
-- but permanently invisible and impossible to contribute to or pull
-- from. Give each one a real fund-type Source, same as the "Fund" type
-- on the create-a-source form.

create or replace function provision_sinking_expense_fund() returns trigger
language plpgsql as $$
declare
  v_source_id uuid;
begin
  if new.fund_id is null then
    insert into funds (user_id, name, balance)
    values (new.user_id, new.name, 0)
    returning id into new.fund_id;

    insert into sources (user_id, name, type, balance)
    values (new.user_id, new.name, 'fund', 0)
    returning id into v_source_id;

    insert into source_funds (user_id, source_id, fund_id)
    values (new.user_id, v_source_id, new.fund_id);
  end if;
  return new;
end;
$$;
alter function provision_sinking_expense_fund() set search_path = public;

-- Keep the Fund and its Source named after the sinking expense, same
-- pattern as sync_budget_source_name for Budget-linked sources.
create or replace function sync_sinking_expense_fund_name() returns trigger
language plpgsql as $$
begin
  if new.name is distinct from old.name and new.fund_id is not null then
    update funds set name = new.name where id = new.fund_id;
    update sources set name = new.name
    where id = (select source_id from source_funds where fund_id = new.fund_id);
  end if;
  return new;
end;
$$;
alter function sync_sinking_expense_fund_name() set search_path = public;

create trigger sinking_expenses_sync_fund_name
after update on sinking_expenses
for each row execute function sync_sinking_expense_fund_name();

-- Backfill: sinking expenses created before this migration have a Fund
-- but no linked Source yet.
with to_link as (
  select se.id as sinking_expense_id, se.user_id, se.fund_id, se.name,
    gen_random_uuid() as new_source_id
  from sinking_expenses se
  where se.fund_id is not null
    and not exists (select 1 from source_funds sf where sf.fund_id = se.fund_id)
),
inserted_sources as (
  insert into sources (id, user_id, name, type, balance)
  select new_source_id, user_id, name, 'fund', 0 from to_link
  returning id
)
insert into source_funds (user_id, source_id, fund_id)
select user_id, new_source_id, fund_id from to_link;
