-- Splitting a transaction now turns it into 2 to 4 real transactions.
--
-- Before: a split kept one row in `transactions` (is_split = true) and its
-- pieces lived in `transaction_splits`. Every view had to union the two
-- tables, and anything that read `transactions` alone (filters, search,
-- export, rules, transfer matching, Income routing, Exclude) saw the
-- original row instead of its pieces.
--
-- After: each piece is an ordinary `transactions` row with split_parent_id
-- pointing at the original. The original keeps is_split = true and stays
-- as the bank's record (re-sync still upserts it by provider id), but
-- nothing counts it: transactions_sync_balance already skips split rows,
-- and every view reads `not is_split`. Pieces count exactly like any other
-- transaction, so Income, Exclude, rules and filters work on them per piece.

-- 1. The link from a piece to its original.
alter table transactions
  add column split_parent_id uuid references transactions(id) on delete cascade;
create index transactions_split_parent_id_idx on transactions (split_parent_id)
  where split_parent_id is not null;
-- One level only: a piece can't itself be split.
alter table transactions
  add constraint transactions_split_one_level check (not (is_split and split_parent_id is not null));

drop trigger transactions_assert_same_user on transactions;
create trigger transactions_assert_same_user before insert or update on transactions
  for each row execute function assert_same_user(
    'account_id', 'accounts', 'category_id', 'categories', 'source_id', 'sources',
    'transfer_from_source_id', 'sources', 'transfer_to_source_id', 'sources',
    'split_parent_id', 'transactions'
  );

-- 2. Convert existing splits. A piece is Income only when it sits on the
-- Income source; the old model gave every leg its parent's is_income, which
-- counted money sent to Float or a fund as Income.
insert into transactions (
  user_id, account_id, split_parent_id, posted_date, amount, description,
  merchant_normalized, status, category_id, category_source, source_id,
  is_income, notes
)
select
  t.user_id, t.account_id, t.id, t.posted_date, ts.amount, t.description,
  t.merchant_normalized, t.status, ts.category_id,
  case when ts.category_id is not null then 'manual' end,
  ts.source_id,
  coalesce(s.type = 'income' and ts.amount > 0, false),
  ts.notes
from transaction_splits ts
join transactions t on t.id = ts.transaction_id
left join sources s on s.id = ts.source_id
where t.is_split;

-- The legs already moved their Sources' balances, and inserting the pieces
-- just applied the same amounts again (transactions_sync_balance). Take
-- that second copy back out.
update sources so
set balance = so.balance - d.total
from (
  select source_id, sum(amount) as total
  from transaction_splits
  where source_id is not null and amount <> 0
  group by source_id
) d
where so.id = d.source_id;

-- 3. Saving a split replaces the original's pieces.
create or replace function save_transaction_splits(p_transaction_id uuid, p_rows jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_parent transactions%rowtype;
  v_total numeric(12,2);
  v_count integer;
  v_budget_source_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- RLS scopes this to the caller's own rows, so a foreign id reads as
  -- "not found" rather than leaking that it exists.
  select * into v_parent
  from transactions
  where id = p_transaction_id and user_id = v_user_id
  for update;

  if v_parent.id is null then
    raise exception 'Transaction not found.' using errcode = 'no_data_found';
  end if;
  if v_parent.split_parent_id is not null then
    raise exception 'This is already a piece of a split. Edit the split instead.' using errcode = 'check_violation';
  end if;
  if v_parent.is_transfer then
    raise exception 'Transfers can''t be split.' using errcode = 'check_violation';
  end if;

  select count(*), coalesce(sum((r->>'amount')::numeric), 0)
  into v_count, v_total
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  where (r->>'amount')::numeric <> 0;

  if v_count > 4 then
    raise exception 'A split can have at most 4 pieces.' using errcode = 'check_violation';
  end if;
  if v_count = 1 then
    raise exception 'A split needs at least 2 pieces.' using errcode = 'check_violation';
  end if;
  if v_count > 0 and round(v_total, 2) <> round(v_parent.amount, 2) then
    raise exception 'Split amounts (%) must sum to the transaction amount (%).',
      to_char(v_total, 'FM999999990.00'), to_char(v_parent.amount, 'FM999999990.00')
      using errcode = 'check_violation';
  end if;

  -- Deleting the old pieces reverses their balances (normal triggers).
  delete from transactions where split_parent_id = p_transaction_id;

  if v_count = 0 then
    -- Unsplit: the original comes back and its own balance re-applies.
    update transactions set is_split = false where id = p_transaction_id;
    return;
  end if;

  -- Splitting reverses the original's balance (transactions_sync_balance
  -- skips split rows) before the pieces apply theirs.
  update transactions set is_split = true where id = p_transaction_id;

  select id into v_budget_source_id from sources where user_id = v_user_id and type = 'budget';

  insert into transactions (
    user_id, account_id, split_parent_id, posted_date, amount, description,
    merchant_normalized, status, category_id, category_source, source_id,
    exclude_from_budget, notes
  )
  select
    v_user_id, v_parent.account_id, v_parent.id, v_parent.posted_date,
    (r->>'amount')::numeric, v_parent.description, v_parent.merchant_normalized,
    v_parent.status,
    -- A category only applies to Budget-sourced money, same as a row.
    case when coalesce((r->>'exclude')::boolean, false) then null
         when nullif(r->>'source_id', '')::uuid is not distinct from v_budget_source_id
         then nullif(r->>'category_id', '')::uuid end,
    case when coalesce((r->>'exclude')::boolean, false) then null
         when nullif(r->>'source_id', '')::uuid is not distinct from v_budget_source_id
              and nullif(r->>'category_id', '') is not null then 'manual' end,
    case when coalesce((r->>'exclude')::boolean, false) then null
         else nullif(r->>'source_id', '')::uuid end,
    coalesce((r->>'exclude')::boolean, false),
    nullif(btrim(coalesce(r->>'notes', '')), '')
  from jsonb_array_elements(p_rows) r
  where (r->>'amount')::numeric <> 0;
end;
$$;

-- 4. Keep pieces in step when the bank re-syncs the original: a pending
-- amount that posts differently (a tip, say) puts the difference on the
-- largest piece, so the pieces always add up; date, description and status
-- follow along. Logged so the change is visible.
create or replace function sync_split_pieces()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_piece_id uuid;
begin
  if not new.is_split then
    return null;
  end if;

  if new.posted_date is distinct from old.posted_date
     or new.description is distinct from old.description
     or new.merchant_normalized is distinct from old.merchant_normalized
     or new.status is distinct from old.status then
    update transactions
    set posted_date = new.posted_date,
        description = new.description,
        merchant_normalized = new.merchant_normalized,
        status = new.status
    where split_parent_id = new.id;
  end if;

  if new.amount is distinct from old.amount then
    select id into v_piece_id
    from transactions
    where split_parent_id = new.id
    order by abs(amount) desc, id
    limit 1;

    if v_piece_id is not null then
      update transactions set amount = amount + (new.amount - old.amount) where id = v_piece_id;

      insert into activity_log (user_id, page, variable, old_value, new_value)
      values (
        new.user_id,
        'Transactions',
        new.description || ' split (bank changed the amount; largest piece adjusted)',
        log_money(old.amount),
        log_money(new.amount)
      );
    end if;
  end if;

  return null;
end;
$$;

create trigger transactions_sync_split_pieces
  after update of amount, posted_date, description, merchant_normalized, status on transactions
  for each row when (new.is_split)
  execute function sync_split_pieces();

-- 5. Views: no more union with transaction_splits. `not is_split` leaves
-- out split originals, and pieces are plain rows.
create or replace view v_inflow_outflow with (security_invoker = on) as
select
  user_id,
  date_trunc('month', posted_date)::date as month,
  coalesce(sum(amount) filter (where amount > 0 and is_income), 0) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income and source_id is not null), 0) as other_inflows
from transactions
where not is_transfer and not exclude_from_budget and not is_split
group by user_id, date_trunc('month', posted_date)::date;

create or replace view v_outflows with (security_invoker = on) as
select
  t.user_id,
  date_trunc('month', t.posted_date)::date as month,
  coalesce(sum(t.amount) filter (where s.type = 'budget' or t.category_id is not null), 0) as expense,
  coalesce(sum(t.amount) filter (
    where not (s.type = 'budget' or t.category_id is not null) and s.type is not null
  ), 0) as other_outflows
from transactions t
left join sources s on s.id = t.source_id
where not t.is_transfer and not t.exclude_from_budget and not t.is_split and t.amount < 0
  and (s.type is not null or t.category_id is not null)
group by t.user_id, date_trunc('month', t.posted_date)::date;

create or replace view v_spending_by_category with (security_invoker = on) as
select
  t.user_id,
  date_trunc('month', t.posted_date)::date as month,
  t.category_id,
  sum(t.amount) as amount
from transactions t
join sources s on s.id = t.source_id
where not t.is_transfer and not t.exclude_from_budget and not t.is_split
  and t.category_id is not null and s.type = 'budget'
group by t.user_id, date_trunc('month', t.posted_date)::date, t.category_id;

create or replace view v_spending_by_source with (security_invoker = on) as
select
  user_id,
  date_trunc('month', posted_date)::date as month,
  source_id,
  sum(amount) as amount
from transactions
where not is_transfer and not exclude_from_budget and not is_split and source_id is not null
group by user_id, date_trunc('month', posted_date)::date, source_id;

create or replace view v_budget_category_income with (security_invoker = on) as
select
  t.user_id,
  date_trunc('month', t.posted_date)::date as month,
  sum(t.amount) as amount
from transactions t
join sources s on s.id = t.source_id
where not t.is_transfer and not t.exclude_from_budget and not t.is_split
  and t.category_id is not null and s.type = 'budget' and t.amount > 0
group by t.user_id, date_trunc('month', t.posted_date)::date;

-- 6. Rules and transfer matching leave split originals and their pieces
-- alone: a rule never overrides a piece the user set by hand, and a split
-- original isn't a transfer candidate.
create or replace function apply_rules(p_user_id uuid default null)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(auth.uid(), p_user_id);
  v_count integer;
begin
  if v_user_id is null then
    return 0;
  end if;

  with candidate as (
    select
      t.id,
      t.source_id as txn_source_id,
      r.category_id,
      r.is_income,
      r.is_exclude,
      r.source_id as rule_source_id,
      row_number() over (
        partition by t.id
        order by length(r.merchant_normalized) desc, r.merchant_normalized
      ) as rn
    from transactions t
    join rules r
      on r.user_id = t.user_id
     and r.merchant_normalized <> ''
     and position(r.merchant_normalized in t.merchant_normalized) > 0
     and (not r.is_income or t.amount > 0)
     and (r.category_id is not null or r.is_income or r.is_exclude or t.source_id is null)
    where t.user_id = v_user_id
      and not t.is_transfer
      and not t.is_income
      and not t.exclude_from_budget
      and not t.is_split
      and t.split_parent_id is null
      and t.category_id is null
      and t.merchant_normalized is not null
  ),
  best as (
    select * from candidate where rn = 1
  )
  update transactions t
  set
    category_id         = case when b.category_id is null then t.category_id     else b.category_id end,
    category_source     = case when b.category_id is null then t.category_source else 'rule'        end,
    is_income            = case when b.is_income then true else t.is_income end,
    exclude_from_budget  = case when b.is_exclude then true else t.exclude_from_budget end,
    source_id            = case
                              when b.is_exclude then null
                              when t.source_id is null and b.rule_source_id is not null
                              then b.rule_source_id
                              else t.source_id
                            end
  from best b
  where t.id = b.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function match_transfer_pairs(p_user_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  matched_count integer := 0;
  pos_row record;
  matched_neg_id uuid;
begin
  for pos_row in
    select id, account_id, amount, posted_date
    from transactions
    where user_id = p_user_id
      and not is_transfer
      and not exclude_from_budget
      and not is_split
      and split_parent_id is null
      and amount > 0
    order by id
  loop
    select id into matched_neg_id
    from transactions
    where user_id = p_user_id
      and not is_transfer
      and not exclude_from_budget
      and not is_split
      and split_parent_id is null
      and amount = -pos_row.amount
      and posted_date = pos_row.posted_date
      and account_id <> pos_row.account_id
    order by id
    limit 1;

    if matched_neg_id is not null then
      update transactions set is_transfer = true where id in (pos_row.id, matched_neg_id);
      matched_count := matched_count + 2;
    end if;
  end loop;

  return matched_count;
end;
$$;

-- 7. Retention: source_spent reads plain rows now.
create or replace function purge_expired_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := date_trunc('month', current_date) - interval '4 months';
begin
  perform set_config('app.purging', 'on', true);

  insert into monthly_totals (user_id, month, kind, ref_id, ref_name, amount)
  select v.user_id, v.month, 'category_spent', v.category_id, c.name, -v.amount
  from v_spending_by_category v
  join categories c on c.id = v.category_id
  where v.month < cutoff
  on conflict (user_id, month, kind, ref_id)
  do update set amount = excluded.amount, ref_name = excluded.ref_name;

  insert into monthly_totals (user_id, month, kind, ref_id, ref_name, amount)
  select t.user_id, date_trunc('month', t.posted_date)::date, 'source_spent', t.source_id, s.name, -sum(t.amount)
  from transactions t
  join sources s on s.id = t.source_id
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split
    and t.amount < 0 and t.posted_date < cutoff
  group by t.user_id, date_trunc('month', t.posted_date)::date, t.source_id, s.name
  on conflict (user_id, month, kind, ref_id)
  do update set amount = excluded.amount, ref_name = excluded.ref_name;

  delete from transactions where posted_date < cutoff;
  delete from activity_log where created_at < cutoff::timestamptz;

  perform set_config('app.purging', 'off', true);
end;
$$;

-- 8. Month start: the Rolling Budget reset sums plain rows now.
create or replace function public.ensure_month_current()
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_current_month date;
  v_advanced boolean;

  v_budget_source_id uuid;
  v_budget_source_name text;
  v_budget_period_start date;
  v_budget_old_balance numeric(12,2);
  v_categories_total numeric(12,2);
  v_transactions_net numeric(12,2);
  v_transfers_net numeric(12,2);

  v_row record;
  v_source_type text;
  v_source_name text;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);

  v_sinking_source_id uuid;
  v_sinking_source_name text;
  v_sinking_period_start date;
  v_contribution numeric(12,2);
  v_sinking_total numeric(12,2) := 0;

  v_income_source_id uuid;
  v_income_source_name text;
  v_income_period_start date;
  v_income_balance numeric(12,2);

  v_allocation numeric(12,2);
begin
  if v_user_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(ensure_month_current_lock_key(v_user_id));

  v_current_month := user_month_start(v_user_id);
  select budget_type = 'advanced' into v_advanced from settings where user_id = v_user_id;

  select id, name, last_applied_month, balance
  into v_budget_source_id, v_budget_source_name, v_budget_period_start, v_budget_old_balance
  from sources where user_id = v_user_id and type = 'budget'
  for update;

  if v_budget_source_id is not null
     and not coalesce(v_advanced, false)
     and v_budget_period_start is distinct from v_current_month then

    select coalesce(sum(monthly_amount), 0) into v_categories_total
    from categories where user_id = v_user_id and archived_at is null;

    -- Split originals are left out; their pieces are plain rows.
    select coalesce(sum(amount), 0) into v_transactions_net
    from transactions
    where user_id = v_user_id and source_id = v_budget_source_id and not is_split
      and date_trunc('month', posted_date)::date = v_current_month;

    select coalesce(sum(
      case when transfer_to_source_id = v_budget_source_id then abs(amount) else 0 end
      - case when transfer_from_source_id = v_budget_source_id then abs(amount) else 0 end
    ), 0) into v_transfers_net
    from transactions
    where user_id = v_user_id and is_transfer
      and (transfer_from_source_id = v_budget_source_id or transfer_to_source_id = v_budget_source_id)
      and date_trunc('month', posted_date)::date = v_current_month;

    update sources
    set balance = v_categories_total + v_transactions_net + v_transfers_net,
        last_applied_month = v_current_month
    where id = v_budget_source_id
    returning balance into v_new_balance;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_user_id,
      'Sources',
      v_budget_source_name || ' balance (monthly budget reset)',
      log_money(v_budget_old_balance),
      log_money(v_new_balance)
    );
  end if;

  for v_row in
    select id, user_id, source_id, name, amount
    from source_transfers
    where user_id = v_user_id
      and last_applied_month is distinct from v_current_month
    order by id
  loop
    select type, name, balance into v_source_type, v_source_name, v_old_balance
    from sources where id = v_row.source_id
    for update;

    if v_source_type is null then
      continue;
    end if;

    update sources set balance = balance + v_row.amount
    where id = v_row.source_id
    returning balance into v_new_balance;

    update source_transfers set last_applied_month = v_current_month where id = v_row.id;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_row.user_id,
      'Sources',
      v_source_name || ' balance (Source Transfer: ' || v_row.name || ')',
      log_money(v_old_balance),
      log_money(v_new_balance)
    );
  end loop;

  select id, name, last_applied_month, balance
  into v_sinking_source_id, v_sinking_source_name, v_sinking_period_start, v_old_balance
  from sources where user_id = v_user_id and type = 'sinking_fund'
  for update;

  if v_sinking_source_id is not null
     and v_sinking_period_start is distinct from v_current_month then
    for v_row in
      select se.id, se.contribution_type, se.amount, se.frequency,
             se.target_amount, se.target_date, se.contributed_to_date
      from sinking_expenses se
      where se.user_id = v_user_id and se.archived_at is null
      order by se.id
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

      update sinking_expenses
      set contributed_to_date = contributed_to_date + v_contribution
      where id = v_row.id;

      v_sinking_total := v_sinking_total + v_contribution;
    end loop;

    update sources
    set balance = balance + v_sinking_total, last_applied_month = v_current_month
    where id = v_sinking_source_id
    returning balance into v_new_balance;

    if v_sinking_total <> 0 then
      insert into activity_log (user_id, page, variable, old_value, new_value)
      values (
        v_user_id,
        'Sources',
        v_sinking_source_name || ' balance (monthly contributions)',
        log_money(v_old_balance),
        log_money(v_new_balance)
      );
    end if;
  end if;

  select id, name, last_applied_month, balance
  into v_income_source_id, v_income_source_name, v_income_period_start, v_income_balance
  from sources where user_id = v_user_id and type = 'income'
  for update;

  if v_income_source_id is not null
     and v_income_period_start is distinct from v_current_month then
    if coalesce(v_advanced, false) and v_budget_source_id is not null then
      -- Advanced: last month's income becomes this month's budget.
      update sources set balance = balance + v_income_balance where id = v_budget_source_id
      returning balance - v_income_balance, balance into v_old_balance, v_new_balance;
      update sources set balance = 0, last_applied_month = v_current_month
      where id = v_income_source_id;

      if v_income_balance <> 0 then
        insert into activity_log (user_id, page, variable, old_value, new_value)
        values
          (
            v_user_id,
            'Sources',
            v_budget_source_name || ' balance (swept from ' || v_income_source_name || ')',
            log_money(v_old_balance),
            log_money(v_new_balance)
          ),
          (
            v_user_id,
            'Sources',
            v_income_source_name || ' balance (swept to ' || v_budget_source_name || ')',
            log_money(v_income_balance),
            log_money(0)
          );
      end if;
    else
      -- Rolling: income is spent as it arrives; the new month starts at 0.
      update sources set balance = 0, last_applied_month = v_current_month
      where id = v_income_source_id;

      if v_income_balance <> 0 then
        insert into activity_log (user_id, page, variable, old_value, new_value)
        values (
          v_user_id,
          'Sources',
          v_income_source_name || ' balance (new month reset)',
          log_money(v_income_balance),
          log_money(0)
        );
      end if;
    end if;
  end if;

  -- Save this month's allocation once.
  if not exists (
    select 1 from monthly_totals
    where user_id = v_user_id and month = v_current_month and kind = 'allocation'
  ) then
    select
      coalesce((select sum(monthly_amount) from categories
                where user_id = v_user_id and archived_at is null), 0)
      + coalesce((
          select sum(
            case
              when se.contribution_type = 'goal' then
                greatest(0, se.target_amount - se.contributed_to_date)
                / greatest(1,
                    (extract(year from se.target_date)::int - extract(year from v_current_month)::int) * 12
                    + (extract(month from se.target_date)::int - extract(month from v_current_month)::int))
              when se.frequency = 'quarterly' then se.amount / 3
              when se.frequency = 'semiannual' then se.amount / 6
              else se.amount / 12
            end)
          from sinking_expenses se
          where se.user_id = v_user_id and se.archived_at is null), 0)
      + coalesce((select sum(amount) from source_transfers where user_id = v_user_id), 0)
    into v_allocation;

    insert into monthly_totals (user_id, month, kind, amount)
    values (v_user_id, v_current_month, 'allocation', v_allocation)
    on conflict (user_id, month, kind, ref_id) do nothing;
  end if;
end;
$function$;

-- 9. The side table goes last, once nothing above reads it.
drop table transaction_splits;
drop function if exists transaction_splits_sync_balance();
drop function if exists check_split_sum();
-- Unused since 2026-10-14 (the old Month Ahead catch-up) and it read the
-- side table.
drop function if exists route_current_month_income_to_fund();
