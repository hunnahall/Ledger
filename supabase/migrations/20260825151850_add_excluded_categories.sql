alter table categories add column is_excluded boolean not null default false;
alter table categories
  add constraint categories_excluded_zero_amount
  check (not is_excluded or monthly_amount = 0);

create or replace function sync_exclude_from_budget_with_category() returns trigger
language plpgsql as $$
declare
  v_is_excluded boolean;
begin
  if new.category_id is not null then
    select is_excluded into v_is_excluded from categories where id = new.category_id;
    if coalesce(v_is_excluded, false) then
      new.exclude_from_budget := true;
    end if;
  end if;
  return new;
end;
$$;
alter function sync_exclude_from_budget_with_category() set search_path = public;

create trigger transactions_sync_excluded_category
  before insert or update of category_id on transactions
  for each row execute function sync_exclude_from_budget_with_category();
