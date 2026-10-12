-- Lets a vendor rule target a Source on its own ("always put this merchant
-- on Courtney"), not just a category, Income, or Excluded. A source-only
-- rule has none of category_id/is_income/is_exclude set and carries the
-- target in source_id, which category rules already used as a secondary
-- fill-in.

alter table vendor_category_rules drop constraint vendor_category_rules_target_check;
alter table vendor_category_rules add constraint vendor_category_rules_target_check
  check (
    (case when category_id is not null then 1 else 0 end)
    + (case when is_income then 1 else 0 end)
    + (case when is_exclude then 1 else 0 end) = 1
    or (
      category_id is null
      and not is_income
      and not is_exclude
      and source_id is not null
    )
  );

-- Same as 20260907120000's version, plus: a source-only rule only matches a
-- transaction that has no source yet (it never overwrites one, same as the
-- existing source fill-in), and it doesn't stamp category_source = 'rule'
-- since it never sets a category.
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
