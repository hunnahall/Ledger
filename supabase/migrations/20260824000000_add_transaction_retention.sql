-- Per-user data retention: how long transactions and activity_log entries
-- are kept before being permanently purged on a rolling basis.
alter table settings add column retention_days smallint not null default 120
  check (retention_days in (60, 90, 120));

-- Deleting a transaction normally reverses its effect on source/fund
-- balances (transactions_sync_balance_trigger,
-- transactions_sync_transfer_balance_trigger, and, via cascade to
-- transaction_splits, transaction_splits_sync_balance_trigger) — that's
-- correct for a user un-doing an entry, but wrong here: purging an old,
-- already-settled transaction must not retroactively change today's
-- balance. Those three triggers are disabled for the duration of the
-- purge and re-enabled after (or automatically restored if the delete
-- fails, since ALTER TABLE ... TRIGGER is transactional).
create or replace function purge_expired_data() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table transactions disable trigger transactions_sync_balance_trigger;
  alter table transactions disable trigger transactions_sync_transfer_balance_trigger;
  alter table transaction_splits disable trigger transaction_splits_sync_balance_trigger;

  delete from transactions t
  using settings s
  where s.user_id = t.user_id
    and t.posted_date < (current_date - (s.retention_days || ' days')::interval);

  delete from activity_log a
  using settings s
  where s.user_id = a.user_id
    and a.created_at < (now() - (s.retention_days || ' days')::interval);

  alter table transactions enable trigger transactions_sync_balance_trigger;
  alter table transactions enable trigger transactions_sync_transfer_balance_trigger;
  alter table transaction_splits enable trigger transaction_splits_sync_balance_trigger;
end;
$$;
alter function purge_expired_data() set search_path = public;

-- Not user-parameterized and touches every user's rows, so keep it off
-- anon entirely; authenticated may call it to apply a just-changed
-- retention setting immediately instead of waiting for the nightly sweep.
revoke execute on function purge_expired_data() from public;
revoke execute on function purge_expired_data() from anon;
grant execute on function purge_expired_data() to authenticated;

create extension if not exists pg_cron;

select cron.schedule('purge-expired-data', '0 3 * * *', $$select public.purge_expired_data();$$);
