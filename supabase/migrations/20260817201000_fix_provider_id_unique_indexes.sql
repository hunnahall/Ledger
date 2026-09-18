-- The partial unique indexes (WHERE ... IS NOT NULL) can't serve as an
-- ON CONFLICT arbiter unless the same WHERE clause is repeated in the
-- conflict target, which PostgREST's .upsert() doesn't do — every sync
-- upsert failed with "no unique or exclusion constraint matching the
-- ON CONFLICT specification". Dropping the partial condition is safe:
-- NULLs are already distinct from each other under a plain unique index,
-- so manual accounts/transactions (bank_connection_id / provider_*_id
-- both NULL) still coexist fine without collision.

drop index accounts_provider_account_unique;
create unique index accounts_provider_account_unique on accounts (bank_connection_id, provider_account_id);

drop index transactions_account_provider_id_unique;
create unique index transactions_account_provider_id_unique on transactions (account_id, provider_transaction_id);
