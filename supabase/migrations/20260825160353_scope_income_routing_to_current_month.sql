-- route_income_to_fund previously routed ANY is_income transaction to the
-- Income source on every insert/update, with no date check. That meant
-- touching an older (already-swept) income transaction at all -- even an
-- unrelated field edit or a routine bank resync -- silently pulled it back
-- into the CURRENT month's Income pool on top of what was already there,
-- since nothing ever un-routes it. Scoping to the current calendar month
-- matches route_current_month_income_to_fund's own scoping (the one-time
-- catch-up run from updateMonthAhead) and the intent stated in its
-- comment: "older income shouldn't retroactively get swept into a pool
-- destined for *next* month's budget."
create or replace function route_income_to_fund() returns trigger
language plpgsql as $$
declare
  v_month_ahead boolean;
  v_income_source_id uuid;
  v_month_start date := date_trunc('month', now())::date;
begin
  select month_ahead into v_month_ahead from settings where user_id = new.user_id;
  v_month_ahead := coalesce(v_month_ahead, false);

  if new.is_income and v_month_ahead and new.posted_date >= v_month_start then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if v_income_source_id is not null then
      new.source_id := v_income_source_id;
    end if;
  elsif tg_op = 'UPDATE' and old.is_income and not new.is_income then
    select id into v_income_source_id from sources where user_id = new.user_id and type = 'income';
    if new.source_id is not distinct from v_income_source_id then
      new.source_id := null;
    end if;
  end if;

  return new;
end;
$$;
alter function route_income_to_fund() set search_path = public;
