-- Sinking expenses can now optionally be goal-based: a target amount to
-- reach by a target date, instead of a recurring payment + frequency. The
-- monthly contribution is still derived, not stored — for goal mode it's
-- (target_amount - linked fund's current balance) / months remaining,
-- computed fresh wherever the frequency-mode monthly amount already was.

alter table sinking_expenses
  add column contribution_type text not null default 'frequency'
    check (contribution_type in ('frequency', 'goal')),
  add column target_amount numeric(12,2),
  add column target_date date,
  alter column frequency drop not null;

alter table sinking_expenses
  add constraint sinking_expenses_mode_fields_chk check (
    (contribution_type = 'frequency' and frequency is not null and target_amount is null and target_date is null)
    or
    (contribution_type = 'goal' and target_amount is not null and target_date is not null and frequency is null)
  );

-- Fold goal-mode contributions into the same monthly reset as frequency-mode
-- ones. Months-remaining is floored at 1 (a target date in the past or the
-- current month is treated as due now, avoiding division by zero/negative).
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
      case
        when se.contribution_type = 'goal' then
          greatest(0, se.target_amount - coalesce(f.balance, 0))
          / greatest(1, (
              extract(year from age(date_trunc('month', se.target_date), v_current_month)) * 12
              + extract(month from age(date_trunc('month', se.target_date), v_current_month))
            ))::int
        else
          case se.frequency
            when 'quarterly' then se.amount / 3
            when 'semiannual' then se.amount / 6
            else se.amount / 12
          end
      end
    ), 0) into v_total
    from sinking_expenses se
    left join funds f on f.id = se.fund_id
    where se.budget_id = p_budget_id and se.archived_at is null;

    update sources
    set balance = v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$$;
alter function ensure_budget_source_current(uuid) set search_path = public;
