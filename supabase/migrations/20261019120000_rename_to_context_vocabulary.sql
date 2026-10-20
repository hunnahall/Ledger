-- Rename to the context.md vocabulary: Rules, Rolling/Advanced budgets,
-- otherInflows, and Expense/otherOutflows.

-- Rules -------------------------------------------------------------------
alter table vendor_category_rules rename to rules;

create or replace function apply_rules(p_user_id uuid default null)
returns integer
language plpgsql
set search_path to 'public'
as $function$
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
$function$;

revoke all on function apply_rules(uuid) from public, anon;
grant execute on function apply_rules(uuid) to authenticated, service_role;
drop function apply_vendor_rules(uuid);

create or replace function learn_rule(
  p_merchant_normalized text,
  p_category_id uuid,
  p_is_income boolean,
  p_source_id uuid,
  p_is_exclude boolean default false
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_inserted boolean;
begin
  if v_user_id is null or coalesce(p_merchant_normalized, '') = '' then
    return;
  end if;

  insert into rules (
    user_id, merchant_normalized, category_id, is_income, source_id, is_exclude, last_used_at
  )
  values (
    v_user_id, p_merchant_normalized, p_category_id, p_is_income, p_source_id, p_is_exclude, now()
  )
  on conflict (user_id, merchant_normalized) do update
  set category_id  = excluded.category_id,
      is_income    = excluded.is_income,
      source_id    = excluded.source_id,
      is_exclude   = excluded.is_exclude,
      last_used_at = excluded.last_used_at,
      use_count    = rules.use_count + 1
  returning (xmax = 0) into v_inserted;

  if v_inserted then
    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_user_id,
      'Rules',
      'Rule: ' || p_merchant_normalized,
      null,
      case
        when p_is_income then 'Income'
        when p_is_exclude then 'Excluded'
        when p_category_id is not null then
          coalesce((select name from categories where id = p_category_id), 'Category')
        else 'Source: ' || coalesce((select name from sources where id = p_source_id), '—')
      end
    );
  end if;
end;
$function$;

revoke all on function learn_rule(text, uuid, boolean, uuid, boolean) from public, anon;
grant execute on function learn_rule(text, uuid, boolean, uuid, boolean) to authenticated, service_role;
drop function learn_vendor_rule(text, uuid, boolean, uuid, boolean);

-- Rolling / Advanced ------------------------------------------------------
alter table settings add column budget_type text not null default 'advanced'
  check (budget_type in ('rolling', 'advanced'));
update settings set budget_type = case when month_ahead then 'advanced' else 'rolling' end;
alter table settings drop column month_ahead;

do $migrate$
declare
  v_def text;
begin
  select pg_get_functiondef('public.ensure_month_current()'::regprocedure) into v_def;
  v_def := replace(v_def, 'v_month_ahead boolean;', 'v_advanced boolean;');
  v_def := replace(v_def, 'select month_ahead into v_month_ahead from settings where user_id = v_user_id;',
                   'select budget_type = ''advanced'' into v_advanced from settings where user_id = v_user_id;');
  v_def := replace(v_def, 'coalesce(v_month_ahead, false)', 'coalesce(v_advanced, false)');
  v_def := replace(v_def, 'Month Ahead on:', 'Advanced:');
  v_def := replace(v_def, 'Month Ahead off:', 'Rolling:');
  execute v_def;
end
$migrate$;

-- Inflows / outflows ------------------------------------------------------
drop view v_inflow_outflow;
create view v_inflow_outflow
with (security_invoker = on) as
select
  user_id,
  month,
  coalesce(sum(amount) filter (where amount > 0 and is_income), 0::numeric) as income,
  coalesce(sum(amount) filter (where amount > 0 and not is_income and source_id is not null), 0::numeric) as other_inflows
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    t.amount,
    t.is_income,
    t.source_id
  from transactions t
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split

  union all

  select
    ts.user_id,
    date_trunc('month', t.posted_date::timestamp with time zone)::date as month,
    ts.amount,
    t.is_income,
    ts.source_id
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  where not t.is_transfer and not t.exclude_from_budget
) combined
group by user_id, month;

-- Expense: a negative amount from the Budget source or carrying a category.
-- Other outflows: every other negative amount that has a source.
-- Amounts stay raw (negative). Rows with no source and no category count
-- toward neither.
drop view v_outflow_by_bucket;
create view v_outflows
with (security_invoker = on) as
select
  user_id,
  month,
  coalesce(sum(amount) filter (where source_type = 'budget' or category_id is not null), 0::numeric) as expense,
  coalesce(sum(amount) filter (where not (source_type = 'budget' or category_id is not null) and source_type is not null), 0::numeric) as other_outflows
from (
  select
    t.user_id,
    date_trunc('month', t.posted_date)::date as month,
    s.type as source_type,
    t.category_id,
    t.amount
  from transactions t
  left join sources s on s.id = t.source_id
  where not t.is_transfer and not t.exclude_from_budget and not t.is_split and t.amount < 0
  union all
  select
    ts.user_id,
    date_trunc('month', t.posted_date)::date as month,
    s.type as source_type,
    ts.category_id,
    ts.amount
  from transaction_splits ts
  join transactions t on t.id = ts.transaction_id
  left join sources s on s.id = ts.source_id
  where not t.is_transfer and not t.exclude_from_budget and ts.amount < 0
) combined
where source_type is not null or category_id is not null
group by user_id, month;
