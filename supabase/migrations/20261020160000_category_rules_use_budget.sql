-- A category rule only applies to Budget money or unsourced money, and puts
-- unsourced money on the Budget source. Before this, a category rule that
-- matched a row on another Source wrote a category that transactions_tidy
-- cleared straight away, so the row stayed eligible and every Run rules
-- counted it again. A category rule made on the Rules page carried no
-- source, so the rows it filled had a Category and no Source (counted as
-- Expense but missing from Spending by Category).
create or replace function public.apply_rules(p_user_id uuid default null)
returns integer
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user_id uuid := coalesce(auth.uid(), p_user_id);
  v_budget_source_id uuid;
  v_count integer;
begin
  if v_user_id is null then
    return 0;
  end if;

  select id into v_budget_source_id
  from sources where user_id = v_user_id and type = 'budget';

  with candidate as (
    select
      t.id,
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
     and (
       r.is_income
       or r.is_exclude
       or t.source_id is null
       or (r.category_id is not null and t.source_id = v_budget_source_id)
     )
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
                              when t.source_id is not null then t.source_id
                              when b.category_id is not null then v_budget_source_id
                              else b.rule_source_id
                            end
  from best b
  where t.id = b.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
