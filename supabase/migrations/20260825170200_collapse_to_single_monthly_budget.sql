-- Removes multi-budget support entirely: exactly one budget per user from
-- now on, permanently named "Monthly" — no create/switch/delete/rename UI.
-- No real multi-budget data exists today (confirmed with the user), so this
-- is pure simplification rather than a data migration.

-- Defensive cleanup: keep each user's current budget (or their oldest if
-- none is marked current), hard-delete any others. Cascades clean up their
-- categories/sinking_expenses/source_transfers/linked budget-type Source
-- automatically via existing FKs.
with keep as (
  select distinct on (user_id) id
  from budgets
  order by user_id, is_current desc, created_at asc
)
delete from budgets where id not in (select id from keep);

update budgets set name = 'Monthly';

drop index budgets_one_current_per_user;
drop index budgets_user_id_idx;
alter table budgets drop column is_current;
alter table budgets add constraint budgets_user_id_unique unique (user_id);

drop trigger budgets_enforce_limit on budgets;
drop function enforce_budget_limit();

-- New users get their singleton "Monthly" budget automatically now (used to
-- require a manual first-budget creation step) — auto-provisions its linked
-- budget-type Source via the existing budgets_provision_source trigger.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (new.id);
  insert into public.budgets (user_id, name) values (new.id, 'Monthly');
  return new;
end;
$$;
