-- Lets a vendor rule target "Excluded" instead of only a category or
-- Income, so the Transactions page's "+" (build rule) toggle can teach
-- "always exclude this merchant" the same way it teaches a category or
-- Income pick (see handleToggleBuildRule in transaction-list.tsx).

alter table vendor_category_rules add column is_exclude boolean not null default false;

alter table vendor_category_rules drop constraint vendor_category_rules_target_check;
alter table vendor_category_rules add constraint vendor_category_rules_target_check
  check (
    (case when category_id is not null then 1 else 0 end)
    + (case when is_income then 1 else 0 end)
    + (case when is_exclude then 1 else 0 end) = 1
  );

-- Postgres keys a function by its parameter list, so create-or-replace
-- with an added parameter would otherwise leave the old 4-arg signature
-- behind as a second overload rather than replacing it.
drop function if exists public.learn_vendor_rule(text, uuid, boolean, uuid);

create or replace function public.learn_vendor_rule(
  p_merchant_normalized text,
  p_category_id uuid,
  p_is_income boolean,
  p_source_id uuid,
  p_is_exclude boolean default false
) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or coalesce(p_merchant_normalized, '') = '' then
    return;
  end if;

  insert into vendor_category_rules (
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
      use_count    = vendor_category_rules.use_count + 1;
end;
$function$;

-- Extends the existing three-way match (longest merchant pattern wins) to
-- also carry is_exclude, and to skip transactions already Excluded so a
-- category/Income rule can't silently re-categorize a row the user (or an
-- earlier exclude rule) already pulled out of tracking.
create or replace function public.apply_vendor_rules(p_user_id uuid default null::uuid)
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
    join vendor_category_rules r
      on r.user_id = t.user_id
     and r.merchant_normalized <> ''
     and position(r.merchant_normalized in t.merchant_normalized) > 0
     and (not r.is_income or t.amount > 0)
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
    category_id         = case when b.is_income or b.is_exclude then t.category_id     else b.category_id end,
    category_source     = case when b.is_income or b.is_exclude then t.category_source else 'rule'         end,
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
