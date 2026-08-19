-- Lower the per-user budget cap from 10 to 3.

create or replace function enforce_budget_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from budgets where user_id = new.user_id) >= 3 then
    raise exception 'Maximum of 3 budgets per user';
  end if;
  return new;
end;
$$;
alter function enforce_budget_limit() set search_path = public;
