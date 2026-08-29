-- The reserved budget-type Source has been called "Monthly" since the
-- multi-budget system was collapsed to one; rename it to "Budget" to match
-- the rest of the app (nav label, route, source_type badge already say
-- "Budget"). Scoped update so it's a no-op if already renamed by hand.
update sources set name = 'Budget' where type = 'budget' and is_system and name = 'Monthly';

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.settings (user_id) values (new.id);
  insert into public.sources (user_id, name, type, is_system, balance) values
    (new.id, 'Budget', 'budget', true, 0),
    (new.id, 'Float', 'float', true, 0),
    (new.id, 'Sinking Fund', 'sinking_fund', true, 0),
    (new.id, 'Income', 'income', true, 0);
  return new;
end;
$function$;
