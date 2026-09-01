-- Replaces the per-user configurable retention_days setting (60/90/120,
-- see 20260824000000_add_transaction_retention.sql) with a fixed policy:
-- always keep the current (partial) calendar month plus the 3 full
-- calendar months before it, purging anything older. This also aligns the
-- retention window with the Dashboard's new month picker, which never
-- offers a month older than this cutoff.
alter table settings drop column retention_days;

create or replace function purge_expired_data() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff date := date_trunc('month', current_date) - interval '3 months';
begin
  alter table transactions disable trigger transactions_sync_balance_trigger;
  alter table transactions disable trigger transactions_sync_transfer_balance_trigger;
  alter table transaction_splits disable trigger transaction_splits_sync_balance_trigger;

  delete from transactions where posted_date < cutoff;
  delete from activity_log where created_at < cutoff::timestamptz;

  alter table transactions enable trigger transactions_sync_balance_trigger;
  alter table transactions enable trigger transactions_sync_transfer_balance_trigger;
  alter table transaction_splits enable trigger transaction_splits_sync_balance_trigger;
end;
$$;
alter function purge_expired_data() set search_path = public;
