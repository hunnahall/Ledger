-- Each budget now gets exactly one auto-provisioned Budget-type source
-- ("the Budget" bucket on the Sources page), rather than users being able
-- to create arbitrary Budget-type sources by hand. It behaves like any
-- other source: balance updates automatically from transactions via the
-- existing sync_source_or_fund_balance trigger, and can be adjusted by
-- hand. Kept in sync by name with its budget (renamed together) and
-- removed if its budget is deleted.

alter table sources add column budget_id uuid references budgets(id) on delete cascade;
create unique index sources_budget_id_unique on sources (budget_id) where budget_id is not null;
create index sources_budget_id_idx on sources (budget_id);

-- Budget-linked sources are system-named after their budget, not
-- user-named, so they're excluded from the user-facing name-uniqueness
-- constraint (two budgets can otherwise share a name).
drop index sources_user_name_unique;
create unique index sources_user_name_unique on sources (user_id, name)
  where archived_at is null and budget_id is null;

create or replace function provision_budget_source() returns trigger
language plpgsql as $$
begin
  insert into sources (user_id, budget_id, name, type, balance)
  values (new.user_id, new.id, new.name, 'budget', 0);
  return new;
end;
$$;
alter function provision_budget_source() set search_path = public;

create trigger budgets_provision_source
after insert on budgets
for each row execute function provision_budget_source();

create or replace function sync_budget_source_name() returns trigger
language plpgsql as $$
begin
  if new.name is distinct from old.name then
    update sources set name = new.name where budget_id = new.id;
  end if;
  return new;
end;
$$;
alter function sync_budget_source_name() set search_path = public;

create trigger budgets_sync_source_name
after update on budgets
for each row execute function sync_budget_source_name();

-- Backfill: budgets created before this migration don't have a linked
-- source yet.
insert into sources (user_id, budget_id, name, type, balance)
select b.user_id, b.id, b.name, 'budget', 0
from budgets b
where not exists (select 1 from sources s where s.budget_id = b.id);
