-- Audit fixes from 2026-10-20, plus the shorter retention window.
--
-- 1. transactions_tidy: one BEFORE trigger that keeps a row's fields
--    consistent no matter which path wrote it (row editor, bulk edit, rules,
--    manual entry, sync, transfer matching). Named to sort after
--    transactions_route_income, so it sees that trigger's result.
--    - Excluded means not tracked: no Source, no Category, not Income. Four
--      Excluded rows had kept the Float source and moved its balance.
--    - A Category only applies to Budget money. A row on any other Source
--      can't keep one (19 rows had, which counted them as Expense while
--      leaving them out of category spending). Unsourced rows keep theirs.
--    - Becoming a transfer clears Income, Source and Category. Sync marked
--      matched transfers without clearing them, so a "Deposit from Next
--      Month" stayed Income and in the Income source balance. Only the
--      change into a transfer is handled: rows already marked are left for
--      Hunter to decide.
-- 2. match_transfer_pairs: one set-based UPDATE instead of a loop that ran a
--    query per positive transaction on every sync.
-- 3. Retention: 4 months in all, the current month plus the 3 full months
--    before it (was 4 full months plus the current one).

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
    if tg_op = 'INSERT' or not old.is_transfer then
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

create trigger transactions_tidy
before insert or update on public.transactions
for each row execute function public.transactions_tidy();

-- The existing rows the trigger now prevents. Touching them runs it; the
-- balance trigger then takes the Excluded rows' amounts back off Float.
update transactions set exclude_from_budget = exclude_from_budget
where exclude_from_budget and not is_split and (source_id is not null or category_id is not null or is_income);

update transactions t set category_id = category_id
from sources s
where s.id = t.source_id and t.category_id is not null and s.type <> 'budget' and not t.is_split;

create or replace function public.match_transfer_pairs(p_user_id uuid)
returns integer
language plpgsql
set search_path to 'public'
as $function$
declare
  v_count integer;
begin
  -- Same rule as before: a positive and a negative of the same size, posted
  -- the same day in different accounts, oldest ids paired first.
  with candidate as (
    select id, account_id, amount, posted_date
    from transactions
    where user_id = p_user_id
      and not is_transfer
      and not exclude_from_budget
      and not is_split
      and split_parent_id is null
      and amount <> 0
  ),
  pos as (
    select *, row_number() over (partition by amount, posted_date order by id) as rn
    from candidate where amount > 0
  ),
  neg as (
    select *, row_number() over (partition by -amount, posted_date order by id) as rn
    from candidate where amount < 0
  ),
  pairs as (
    select p.id as pos_id, n.id as neg_id
    from pos p
    join neg n
      on n.amount = -p.amount
     and n.posted_date = p.posted_date
     and n.rn = p.rn
     and n.account_id <> p.account_id
  )
  update transactions
  set is_transfer = true
  where id in (select pos_id from pairs union all select neg_id from pairs);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

create or replace function public.purge_expired_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- The current month plus the 3 full months before it.
  cutoff date := date_trunc('month', current_date) - interval '3 months';
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
$function$;

revoke execute on function public.purge_expired_data() from public, anon, authenticated;

-- Apply the new window now rather than at tonight's 03:00 run.
select public.purge_expired_data();
