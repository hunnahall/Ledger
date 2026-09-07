-- Date and description are now user-editable on the Transactions page (click
-- a cell to edit). Every sync re-pulls an overlapping window from SimpleFin
-- (one day of overlap, or a whole backfill range on Import), so a
-- transaction that already posted and was hand-corrected kept getting its
-- posted_date/description/merchant_normalized silently reverted to the
-- bank's copy on the next sync -- the same clobbering problem is_income was
-- already carved out for below. Once a transaction is no longer pending,
-- freeze those three fields; amount/status still always track the bank,
-- since a pending amount can still be corrected and pending -> posted is
-- exactly the transition this function exists to catch.
create or replace function sync_bank_transactions(p_rows jsonb) returns void
language plpgsql as $$
begin
  insert into transactions (
    user_id, account_id, provider_transaction_id, posted_date, amount,
    description, merchant_normalized, status, is_income
  )
  select
    (r->>'user_id')::uuid,
    (r->>'account_id')::uuid,
    r->>'provider_transaction_id',
    (r->>'posted_date')::date,
    (r->>'amount')::numeric,
    r->>'description',
    r->>'merchant_normalized',
    r->>'status',
    (r->>'amount')::numeric > 0
  from jsonb_array_elements(p_rows) as r
  on conflict (account_id, provider_transaction_id)
  do update set
    posted_date = case
                    when transactions.status = 'pending' then excluded.posted_date
                    else transactions.posted_date
                  end,
    amount = excluded.amount,
    description = case
                    when transactions.status = 'pending' then excluded.description
                    else transactions.description
                  end,
    merchant_normalized = case
                    when transactions.status = 'pending' then excluded.merchant_normalized
                    else transactions.merchant_normalized
                  end,
    status = excluded.status;
end;
$$;
alter function sync_bank_transactions(jsonb) set search_path = public;
