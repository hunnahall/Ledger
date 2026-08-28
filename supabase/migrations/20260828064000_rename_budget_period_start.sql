alter table sources rename column budget_period_start to last_applied_month;

create or replace function ensure_budget_source_current(p_user_id uuid) returns void
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
  select id, last_applied_month into v_source_id, v_period_start
  from sources where user_id = p_user_id and type = 'budget';
  if v_source_id is null then return; end if;

  select month_ahead into v_month_ahead from settings where user_id = p_user_id;
  if coalesce(v_month_ahead, false) then return; end if;

  if v_period_start is distinct from v_current_month then
    select coalesce(sum(monthly_amount), 0) into v_total
    from categories where user_id = p_user_id and archived_at is null;
    update sources set balance = v_total, last_applied_month = v_current_month where id = v_source_id;
  end if;
end;
$function$;

create or replace function ensure_income_fund_current(p_user_id uuid) returns void
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

  select id, last_applied_month, balance into v_income_source_id, v_period_start, v_income_balance
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
  update sources set balance = 0, last_applied_month = v_current_month where id = v_income_source_id;
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
  select id, last_applied_month into v_source_id, v_period_start
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
    set balance = balance + v_total, last_applied_month = v_current_month
    where id = v_source_id;
  end if;
end;
$function$;
