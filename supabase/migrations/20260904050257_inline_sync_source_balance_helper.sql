-- sync_source_or_fund_balance was a one-statement helper, but because the
-- balance triggers run with invoker rights it had to stay EXECUTE-able by
-- `authenticated` -- which also let any user rpc it directly and set one of
-- their own source balances to an arbitrary value. Inlining the statement
-- into its only two remaining callers removes the RPC surface entirely
-- while keeping the important property: the UPDATE still runs as the user,
-- so RLS still scopes it to their own sources.

create or replace function transactions_sync_balance() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Set only by purge_expired_data (transaction-local). Aged-out history
  -- being deleted must not rewind the current balance.
  if current_setting('app.purging', true) = 'on' then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and not old.is_split
     and old.source_id is not null and old.amount <> 0 then
    update sources set balance = balance - old.amount where id = old.source_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and not new.is_split
     and new.source_id is not null and new.amount <> 0 then
    update sources set balance = balance + new.amount where id = new.source_id;
  end if;

  return null;
end;
$$;

create or replace function transaction_splits_sync_balance() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.purging', true) = 'on' then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE')
     and old.source_id is not null and old.amount <> 0 then
    update sources set balance = balance - old.amount where id = old.source_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
     and new.source_id is not null and new.amount <> 0 then
    update sources set balance = balance + new.amount where id = new.source_id;
  end if;

  return null;
end;
$$;

drop function if exists sync_source_or_fund_balance(uuid, numeric);
