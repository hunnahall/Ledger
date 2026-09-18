-- SimpleFin-synced transactions have no way to know a withdrawal in one of
-- the user's accounts and a deposit in another are the same movement of
-- money — is_transfer is otherwise only ever set by the user's own explicit
-- "Transfer" choice on the manual-entry/edit forms. Left unmatched, both
-- sides count as regular income/spending, which can badly inflate
-- v_inflow_outflow (e.g. a savings-to-checking transfer showing up as
-- income). This finds same-user pairs — opposite exact amounts, same
-- posted_date, different accounts, not already a transfer — and flags both
-- sides. Matching is intentionally strict (exact amount, exact date) to
-- keep false positives on unrelated same-day coincidences rare.
--
-- Greedy sequential loop rather than a row_number()-paired join: with a
-- set-based join, a same-account "impostor" candidate (same amount/date as
-- a real transfer, but not actually a transfer) can claim the positional
-- slot a genuine cross-account counterpart needed, blocking the real match
-- entirely. Matching one positive transaction at a time against the first
-- still-unmatched, different-account counterpart avoids that.
create or replace function match_transfer_pairs(p_user_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  matched_count integer := 0;
  pos_row record;
  matched_neg_id uuid;
begin
  for pos_row in
    select id, account_id, amount, posted_date
    from transactions
    where user_id = p_user_id
      and not is_transfer
      and not exclude_from_budget
      and amount > 0
    order by id
  loop
    select id into matched_neg_id
    from transactions
    where user_id = p_user_id
      and not is_transfer
      and not exclude_from_budget
      and amount = -pos_row.amount
      and posted_date = pos_row.posted_date
      and account_id <> pos_row.account_id
    order by id
    limit 1;

    if matched_neg_id is not null then
      update transactions set is_transfer = true where id in (pos_row.id, matched_neg_id);
      matched_count := matched_count + 2;
    end if;
  end loop;

  return matched_count;
end;
$$;
