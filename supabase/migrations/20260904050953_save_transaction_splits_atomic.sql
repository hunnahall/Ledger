-- saveSplits did delete -> insert -> update is_split as three separate
-- round trips, each firing balance triggers, so a failure part-way left
-- is_split wrong and the source balances drifted. It also validated the
-- split sum against a transaction amount passed in from the client, which
-- made the check bypassable. Both fixed here: one atomic statement, and the
-- amount read from the row itself.
create or replace function save_transaction_splits(
  p_transaction_id uuid,
  p_rows jsonb
) returns void
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount numeric(12,2);
  v_total numeric(12,2);
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- RLS scopes this to the caller's own rows, so a foreign id reads as
  -- "not found" rather than leaking that it exists.
  select amount into v_amount
  from transactions
  where id = p_transaction_id and user_id = v_user_id
  for update;

  if v_amount is null then
    raise exception 'Transaction not found.' using errcode = 'no_data_found';
  end if;

  select count(*), coalesce(sum((r->>'amount')::numeric), 0)
  into v_count, v_total
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  where (r->>'amount')::numeric <> 0;

  delete from transaction_splits where transaction_id = p_transaction_id;

  if v_count = 0 then
    update transactions set is_split = false where id = p_transaction_id;
    return;
  end if;

  if round(v_total, 2) <> round(v_amount, 2) then
    raise exception 'Split amounts (%) must sum to the transaction amount (%).',
      to_char(v_total, 'FM999999990.00'), to_char(v_amount, 'FM999999990.00')
      using errcode = 'check_violation';
  end if;

  insert into transaction_splits (user_id, transaction_id, category_id, source_id, amount)
  select
    v_user_id,
    p_transaction_id,
    nullif(r->>'category_id', '')::uuid,
    nullif(r->>'source_id', '')::uuid,
    (r->>'amount')::numeric
  from jsonb_array_elements(p_rows) r
  where (r->>'amount')::numeric <> 0;

  update transactions set is_split = true where id = p_transaction_id;
end;
$$;

revoke execute on function save_transaction_splits(uuid, jsonb) from public, anon;
grant execute on function save_transaction_splits(uuid, jsonb) to authenticated;
