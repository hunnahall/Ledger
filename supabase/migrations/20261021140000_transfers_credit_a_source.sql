-- Transfers credit a Source through a linked copy of the transaction.
--
-- Before: ensure_month_current() credited every due Source Transfer to its
-- Source on the first app open of a month, with no transaction behind it.
-- Now: marking a transaction as a transfer to a Source (mark_transfer) adds a
-- copy of it with the absolute amount, booked to that Source, so the Source's
-- balance moves through the ordinary balance trigger and the move is on
-- record. The copy is itself a transfer row (is_transfer = true), so every
-- view that leaves transfers out leaves it out too. It points at the original
-- through transfer_of: unmarking the original, or deleting it, removes the
-- copy and takes the amount back off the Source.
--
-- Source Transfers on the Budget page stay as planned amounts in the
-- allocation. They just don't move a balance anymore. Nothing is back-filled:
-- transfers marked before this migration get no copy.

alter table public.transactions
  add column transfer_of uuid references public.transactions(id) on delete cascade;

create unique index transactions_transfer_of_key
  on public.transactions (transfer_of) where transfer_of is not null;

-- A transfer copy keeps its Source; every other transfer still loses it.
create or replace function public.transactions_tidy()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source_type source_type;
begin
  if new.is_split then
    return new;
  end if;

  if new.is_transfer then
    if new.transfer_of is not null then
      new.is_income := false;
      new.category_id := null;
      new.category_source := null;
    elsif tg_op = 'INSERT' or not old.is_transfer then
      new.is_income := false;
      new.source_id := null;
      new.category_id := null;
      new.category_source := null;
    end if;
    return new;
  end if;

  if new.exclude_from_budget then
    new.is_income := false;
    new.source_id := null;
    new.category_id := null;
    new.category_source := null;
    return new;
  end if;

  if new.category_id is not null and new.source_id is not null then
    select type into v_source_type from sources where id = new.source_id;
    if v_source_type is distinct from 'budget' then
      new.category_id := null;
      new.category_source := null;
    end if;
  end if;

  return new;
end;
$function$;

-- Unmarking the original removes its copy (the balance trigger reverses it).
create or replace function public.transactions_drop_transfer_copy()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  delete from transactions where transfer_of = old.id;
  return null;
end;
$function$;

create trigger transactions_drop_transfer_copy
after update of is_transfer on public.transactions
for each row when (old.is_transfer and not new.is_transfer and old.transfer_of is null)
execute function public.transactions_drop_transfer_copy();

-- Marks a transaction as a transfer and books its absolute amount to a Source.
-- Calling it again for the same transaction moves the copy to the new Source.
create or replace function public.mark_transfer(p_transaction_id uuid, p_source_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_txn transactions%rowtype;
begin
  select * into v_txn from transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'Transaction not found.';
  end if;
  if v_txn.is_split then
    raise exception 'Split the pieces instead: a split original can''t be a transfer.';
  end if;
  if v_txn.transfer_of is not null then
    raise exception 'This row is the copy of a transfer.';
  end if;
  if v_txn.amount = 0 then
    raise exception 'A zero amount can''t be transferred.';
  end if;
  perform 1 from sources where id = p_source_id and archived_at is null;
  if not found then
    raise exception 'Source not found.';
  end if;

  delete from transactions where transfer_of = p_transaction_id;

  update transactions set is_transfer = true where id = p_transaction_id;

  insert into transactions (
    user_id, account_id, posted_date, description, amount, status,
    source_id, is_transfer, transfer_of
  ) values (
    v_txn.user_id, null, v_txn.posted_date, v_txn.description, abs(v_txn.amount), v_txn.status,
    p_source_id, true, p_transaction_id
  );
end;
$function$;

revoke all on function public.mark_transfer(uuid, uuid) from public, anon;
grant execute on function public.mark_transfer(uuid, uuid) to authenticated;

-- ensure_month_current without the Source Transfer credit loop.
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