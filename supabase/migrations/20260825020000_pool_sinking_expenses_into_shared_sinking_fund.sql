-- Feature change: sinking expenses no longer each get their own dedicated
-- Fund. Instead there's one shared "Sinking Fund" default Source (same
-- idea as "Float": reserved type, shown in the Sources page's Budget
-- section, backfilled one per user) that every sinking expense's derived
-- monthly contribution is pooled into automatically at the start of each
-- month — the same lazy "catch up whenever next touched" pattern as
-- ensure_budget_source_current/ensure_source_transfers_current.
--
-- This also fixes a double-count: sinking contributions used to be folded
-- into the Budget-linked source's own monthly reset total. Now that they
-- have their own dedicated transfer (matching how Source Transfers already
-- work), they're removed from that total instead of being credited twice.

-- 1. Remove the per-sinking-expense Fund plumbing added in the previous
-- migration (20260825010000) and the original fund-only provisioning
-- before it — replaced entirely by the shared Sinking Fund below.
drop trigger if exists sinking_expenses_sync_fund_name on sinking_expenses;
drop function if exists sync_sinking_expense_fund_name();
drop trigger if exists sinking_expenses_provision_fund on sinking_expenses;
drop function if exists provision_sinking_expense_fund();

-- Clean up the two individual Fund/Source/source_funds rows that
-- 20260825010000 just linked for the existing "Car insurance" and "Gym"
-- sinking expenses — confirmed via query that nothing (no transactions,
-- splits, or source transfers) references either Source yet, so this is a
-- clean removal rather than an archive. Deleting the Source first cascades
-- to its source_funds row (source_funds.source_id references sources(id)
-- on delete cascade); the Fund itself is deleted separately after.
delete from sources where id in (
  select sf.source_id from source_funds sf
  join sinking_expenses se on se.fund_id = sf.fund_id
);
delete from funds where id in (select fund_id from sinking_expenses where fund_id is not null);

alter table sinking_expenses drop column fund_id;

-- Tracks each sinking expense's own cumulative contribution so goal-mode's
-- "target minus what's already saved" math still works per-expense even
-- though the actual money all lands in one shared pot (see
-- ensure_sinking_fund_current below) rather than a dedicated fund whose
-- balance could be read directly.
alter table sinking_expenses add column contributed_to_date numeric(12,2) not null default 0;

-- 2. New reserved source type for the shared pool, same treatment as
-- 'budget'/'float': excluded from the Past Payments/Future Repayments/
-- Funds groupings (groupSourcesByType's catch-all), rendered explicitly
-- in the Sources page's Budget section instead, but still a normal,
-- pickable source everywhere else.
alter table sources drop constraint sources_type_check;
alter table sources add constraint sources_type_check
  check (type in ('budget', 'past_payment', 'future_repayment', 'fund', 'float', 'sinking_fund'));

insert into sources (user_id, name, type, balance)
select u.id, 'Sinking Fund', 'sinking_fund', 0
from auth.users u
where not exists (
  select 1 from sources s where s.user_id = u.id and s.name = 'Sinking Fund' and s.budget_id is null
);

-- 3. Sinking contributions are no longer folded into the Budget source's
-- own monthly reset total — they get their own transfer now (below).
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

    update sources
    set balance = v_total, budget_period_start = v_current_month
    where id = v_source_id;
  end if;
end;
$$;
alter function ensure_budget_source_current(uuid) set search_path = public;

-- 4. Lazy monthly apply for the shared Sinking Fund, same pattern as the
-- other two: reuses sources.budget_period_start (already used the same
-- way for the Budget source) as "which month has this pool last been
-- topped up for", even though this source has no budget_id of its own —
-- it pools every one of the user's budgets' sinking expenses, not just
-- one. Adds each expense's derived monthly contribution to its own
-- contributed_to_date (for goal-mode's math) and sums them into one
-- credit to the shared Source balance.
create or replace function ensure_sinking_fund_current(p_user_id uuid) returns void
language plpgsql as $$
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
      join budgets b on b.id = se.budget_id
      where b.user_id = p_user_id and se.archived_at is null
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
$$;
alter function ensure_sinking_fund_current(uuid) set search_path = public;
