-- learnVendorRule was a select-then-insert-or-update with a hand-written
-- 23505 recovery path for the race between the two, and it incremented
-- use_count by reading it into JS and writing back -- so two concurrent
-- categorizations of the same merchant lost one of the increments.
-- One upsert does all of it atomically.
create or replace function learn_vendor_rule(
  p_merchant_normalized text,
  p_category_id uuid,
  p_is_income boolean,
  p_source_id uuid
) returns void
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or coalesce(p_merchant_normalized, '') = '' then
    return;
  end if;

  insert into vendor_category_rules (
    user_id, merchant_normalized, category_id, is_income, source_id, last_used_at
  )
  values (
    v_user_id, p_merchant_normalized, p_category_id, p_is_income, p_source_id, now()
  )
  on conflict (user_id, merchant_normalized) do update
  set category_id  = excluded.category_id,
      is_income    = excluded.is_income,
      source_id    = excluded.source_id,
      last_used_at = excluded.last_used_at,
      use_count    = vendor_category_rules.use_count + 1;
end;
$$;

revoke execute on function learn_vendor_rule(text, uuid, boolean, uuid) from public, anon;
grant execute on function learn_vendor_rule(text, uuid, boolean, uuid) to authenticated;
