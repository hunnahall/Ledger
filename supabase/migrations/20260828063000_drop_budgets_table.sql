-- 1. categories: budget_id -> nothing (user_id already present, NOT NULL).
alter table categories drop constraint categories_budget_id_fkey;
drop index categories_budget_name_unique;
drop index categories_budget_id_idx;
alter table categories drop column budget_id;
create unique index categories_user_name_unique on categories (user_id, name) where archived_at is null;

-- 2. sinking_expenses: same treatment.
alter table sinking_expenses drop constraint sinking_expenses_budget_id_fkey;
drop index sinking_expenses_budget_name_unique;
drop index sinking_expenses_budget_id_idx;
alter table sinking_expenses drop column budget_id;
create unique index sinking_expenses_user_name_unique on sinking_expenses (user_id, name) where archived_at is null;

-- 3. source_transfers: same treatment (already has a plain user_id index).
alter table source_transfers drop constraint source_transfers_budget_id_fkey;
drop index source_transfers_budget_id_idx;
alter table source_transfers drop column budget_id;

-- 4. sources.budget_id: no longer needed — the Budget-type source is
--    identified purely by type = 'budget' + is_system = true, and
--    sources_one_system_per_type already enforces "exactly one per user"
--    without a budget_id FK.
alter table sources drop constraint sources_budget_id_fkey;
drop index sources_budget_id_unique;
drop index sources_budget_id_idx;
alter table sources drop column budget_id;

-- 5. Drop functions whose signature changes below (param rename requires
--    an explicit drop, not create-or-replace), plus budgets-only triggers.
drop function if exists provision_budget_source() cascade;
drop function if exists sync_budget_source_name() cascade;
drop function ensure_budget_source_current(uuid);
drop function ensure_income_fund_current(uuid, uuid);
drop function ensure_source_transfers_current(uuid);
drop table budgets;

-- 6. handle_new_user: provision all 4 reserved singleton sources directly
--    (previously only the Budget-type source was auto-provisioned, via the
--    now-dropped budgets_provision_source trigger; Float/Sinking
--    Fund/Income were only ever backfilled once for pre-existing users in
--    their own migrations — new signups after those migrations got NO
--    Float/Sinking Fund/Income source at all. This closes that gap.)
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.settings (user_id) values (new.id);
  insert into public.sources (user_id, name, type, is_system, balance) values
    (new.id, 'Monthly', 'budget', true, 0),
    (new.id, 'Float', 'float', true, 0),
    (new.id, 'Sinking Fund', 'sinking_fund', true, 0),
    (new.id, 'Income', 'income', true, 0);
  return new;
end;
$function$;

-- 7. Rewrite the 3 functions that took p_budget_id — look up the reserved
--    Budget-type source by user_id instead.
create function ensure_budget_source_current(p_user_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source_id uuid;
  v_period_start date;
  v_total numeric(12,2);
  v_current_month date := date_trunc('month', now())::date;
  v_month_ahead boolean;
begin
  select id, budget_period_start into v_source_id, v_period_start
  from sources where user_id = p_user_id and type = 'budget';
  if v_source_id is null then return; end if;

  select month_ahead into v_month_ahead from settings where user_id = p_user_id;
  if coalesce(v_month_ahead, false) then return; end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_total
    from categories where user_id = p_user_id and archived_at is null;
    update sources set balance = v_total, budget_period_start = v_current_month where id = v_source_id;
  end if;
end;
$function$;

create function ensure_income_fund_current(p_user_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_income_source_id uuid;
  v_period_start date;
  v_income_balance numeric(12,2);
  v_budget_source_id uuid;
  v_current_month date := date_trunc('month', now())::date;
  v_month_ahead boolean;
begin
  select month_ahead into v_month_ahead from settings where user_id = p_user_id;
  if not coalesce(v_month_ahead, false) then
    return;
  end if;

  select id, budget_period_start, balance into v_income_source_id, v_period_start, v_income_balance
  from sources
  where user_id = p_user_id and type = 'income';

  if v_income_source_id is null or v_period_start is not distinct from v_current_month then
    return;
  end if;

  select id into v_budget_source_id from sources where user_id = p_user_id and type = 'budget';
  if v_budget_source_id is null then
    return;
  end if;

  update sources set balance = balance + v_income_balance where id = v_budget_source_id;
  update sources set balance = 0, budget_period_start = v_current_month where id = v_income_source_id;
end;
$function$;

create function ensure_source_transfers_current(p_user_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_row record;
  v_source_type text;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_source_name text;
  v_current_month date := date_trunc('month', now())::date;
begin
  for v_row in
    select id, user_id, source_id, name, amount
    from source_transfers
    where user_id = p_user_id
      and (last_applied_month is distinct from v_current_month)
  loop
    select type, name, balance into v_source_type, v_source_name, v_old_balance
    from sources where id = v_row.source_id;

    if v_source_type is null then
      -- Source Transfer's Source was deleted out from under it; skip
      -- rather than error the whole budget page.
      continue;
    end if;

    perform sync_source_or_fund_balance(v_row.source_id, v_row.amount);

    select balance into v_new_balance from sources where id = v_row.source_id;

    update source_transfers set last_applied_month = v_current_month
    where id = v_row.id;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_row.user_id,
      'Sources',
      v_source_name || ' balance (Source Transfer: ' || v_row.name || ')',
      v_old_balance::text,
      v_new_balance::text
    );
  end loop;
end;
$function$;

create or replace function ensure_sinking_fund_current(p_user_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source_id uuid;
  v_period_start date;
  v_current_month date := date_trunc('month', now())::date;
  v_row record;
  v_contribution numeric(12,2);
  v_total numeric(12,2) := 0;
begin
  select id, budget_period_start into v_source_id, v_period_start
  from sources
  where user_id = p_user_id and type = 'sinking_fund';

  if v_source_id is null then
    return;
  end if;

  if v_period_start is distinct from v_current_month then
    for v_row in
      select se.id, se.contribution_type, se.amount, se.frequency,
        se.target_amount, se.target_date, se.contributed_to_date
      from sinking_expenses se
      where se.user_id = p_user_id and se.archived_at is null
    loop
      if v_row.contribution_type = 'goal' then
        v_contribution := greatest(0, v_row.target_amount - v_row.contributed_to_date)
          / greatest(1, (
              extract(year from age(date_trunc('month', v_row.target_date), v_current_month)) * 12
              + extract(month from age(date_trunc('month', v_row.target_date), v_current_month))
            ))::int;
      else
        v_contribution := case v_row.frequency
          when 'quarterly' then v_row.amount / 3
          when 'semiannual' then v_row.amount / 6
          else v_row.amount / 12
        end;
      end if;

      update sinking_expenses set contributed_to_date = contributed_to_date + v_contribution
      where id = v_row.id;

      v_total := v_total + v_contribution;
    end loop;

    update sources
    set balance = balance + v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$function$;
