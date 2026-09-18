-- The "loop uncategorized transactions, find the longest matching rule,
-- UPDATE one row at a time" logic existed three times: runVendorRulesNow in
-- lib/actions/vendor-rules.ts, the post-sync block in the simplefin-sync
-- edge function, and inline variants in lib/actions/transactions.ts. All
-- three were N+1 round trips, and the server-action one aborted the whole
-- batch on the first failing row. One set-based statement replaces them.
--
-- An authenticated caller always operates on themselves no matter what they
-- pass; p_user_id is only consulted when auth.uid() is null, which is the
-- case for the edge function running as service_role.
create or replace function apply_vendor_rules(p_user_id uuid default null)
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
      r.source_id as rule_source_id,
      row_number() over (
        partition by t.id
        -- Longest pattern wins, so a specific multi-word rule beats a
        -- shorter generic one covering the same transaction. The secondary
        -- key only makes equal-length ties deterministic.
        order by length(r.merchant_normalized) desc, r.merchant_normalized
      ) as rn
    from transactions t
    join vendor_category_rules r
      on r.user_id = t.user_id
     and r.merchant_normalized <> ''
     -- A rule's pattern only has to appear somewhere in the normalized
     -- description, not equal it (banks pad merchants with terminal codes
     -- and locations), matching findMatchingRule in
     -- lib/transactions/match-vendor-rule.ts.
     and position(r.merchant_normalized in t.merchant_normalized) > 0
     -- transactions_is_income_amount_chk forbids is_income on a negative
     -- amount; skip rather than let one bad row error the whole batch.
     and (not r.is_income or t.amount > 0)
    where t.user_id = v_user_id
      and not t.is_transfer
      -- Already flagged Income (by sync_bank_transactions or the user):
      -- leave it alone rather than let a category rule strip the flag.
      and not t.is_income
      and t.category_id is null
      and t.merchant_normalized is not null
  ),
  best as (
    select * from candidate where rn = 1
  )
  update transactions t
  set
    category_id     = case when b.is_income then t.category_id     else b.category_id end,
    category_source = case when b.is_income then t.category_source else 'rule'        end,
    is_income       = case when b.is_income then true              else t.is_income   end,
    source_id       = case
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

revoke execute on function apply_vendor_rules(uuid) from public, anon;
grant execute on function apply_vendor_rules(uuid) to authenticated, service_role;
