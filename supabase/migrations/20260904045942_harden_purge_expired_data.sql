-- Two problems with purge_expired_data(), both from when this was a
-- single-user app.
--
-- 1. It is SECURITY DEFINER and deletes globally (no user_id filter), yet
--    20260824000000_add_transaction_retention.sql granted EXECUTE to
--    `authenticated`. CREATE OR REPLACE does not reset privileges, so that
--    grant survived every later redefinition: any signed-in user could call
--    /rest/v1/rpc/purge_expired_data and wipe *every* user's transactions
--    and activity log older than the retention cutoff. Nothing in the app
--    ever called it — only the pg_cron job does, and cron runs as the
--    function owner, which needs no role grant.
--
-- 2. It disabled the balance-sync triggers with ALTER TABLE, which takes an
--    ACCESS EXCLUSIVE lock on `transactions` and `transaction_splits` for
--    the duration — blocking every other user's reads and writes while the
--    purge runs. Replaced with a transaction-local GUC the triggers check,
--    which needs no lock and no elevated role.
--
-- The intent behind suppressing the triggers is unchanged: deleting history
-- that has aged out of the retention window must not move today's balances.

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

  if tg_op = 'INSERT' then
    if not new.is_split then
      perform sync_source_or_fund_balance(new.source_id, new.amount);
    end if;
  elsif tg_op = 'UPDATE' then
    if not old.is_split then
      perform sync_source_or_fund_balance(old.source_id, -old.amount);
    end if;
    if not new.is_split then
      perform sync_source_or_fund_balance(new.source_id, new.amount);
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_split then
      perform sync_source_or_fund_balance(old.source_id, -old.amount);
    end if;
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

  if tg_op = 'INSERT' then
    perform sync_source_or_fund_balance(new.source_id, new.amount);
  elsif tg_op = 'UPDATE' then
    perform sync_source_or_fund_balance(old.source_id, -old.amount);
    perform sync_source_or_fund_balance(new.source_id, new.amount);
  elsif tg_op = 'DELETE' then
    perform sync_source_or_fund_balance(old.source_id, -old.amount);
  end if;
  return null;
end;
$$;

create or replace function transactions_sync_transfer_balance() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_delta numeric;
  v_new_delta numeric;
begin
  if current_setting('app.purging', true) = 'on' then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.is_transfer then
    v_old_delta := abs(old.amount);
    if old.transfer_from_source_id is not null then
      update sources set balance = balance + v_old_delta where id = old.transfer_from_source_id;
    end if;
    if old.transfer_to_source_id is not null then
      update sources set balance = balance - v_old_delta where id = old.transfer_to_source_id;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.is_transfer then
    v_new_delta := abs(new.amount);
    if new.transfer_from_source_id is not null then
      update sources set balance = balance - v_new_delta where id = new.transfer_from_source_id;
    end if;
    if new.transfer_to_source_id is not null then
      update sources set balance = balance + v_new_delta where id = new.transfer_to_source_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace function purge_expired_data() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := date_trunc('month', current_date) - interval '3 months';
begin
  -- Transaction-local, so it cannot leak into any other session and is
  -- cleared automatically when this statement's transaction ends.
  perform set_config('app.purging', 'on', true);

  delete from transactions where posted_date < cutoff;
  delete from activity_log where created_at < cutoff::timestamptz;

  perform set_config('app.purging', 'off', true);
end;
$$;

-- Cron ('purge-expired-data', scheduled in 20260824000000) runs as the
-- function owner and needs no role grant. Nothing else may call this.
revoke execute on function purge_expired_data() from public, anon, authenticated;
