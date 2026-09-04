-- Postgres performs referential-integrity checks with full table privileges,
-- deliberately bypassing RLS. So although every table is RLS-scoped to its
-- owner, nothing stops an authenticated user from writing their OWN row with
-- a category_id / source_id / account_id belonging to SOMEONE ELSE -- the FK
-- constraint validates only that the referenced row exists.
--
-- The server actions all take these ids straight from FormData
-- (createManualTransaction, assignTransaction, bulkUpdateTransactions,
-- saveSplits, createVendorRule, createSourceTransfer, ...), so the only
-- thing standing between a guessed UUID and a cross-tenant reference is the
-- unguessability of UUIDs. No data leaks -- the read-side join is still
-- RLS-filtered -- but it corrupts the per-user aggregation views, which
-- group by the transaction's own user_id rather than the referenced row's.
--
-- One generic trigger closes it at the layer the FK check runs in.
create or replace function assert_same_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col text;
  v_table text;
  v_ref_id uuid;
  v_owner uuid;
  v_row_user uuid;
begin
  v_row_user := (to_jsonb(new) ->> 'user_id')::uuid;

  -- Pairs of (column on NEW, table it references), passed as trigger args.
  for i in 0 .. (tg_nargs / 2 - 1) loop
    v_col   := tg_argv[i * 2];
    v_table := tg_argv[i * 2 + 1];
    v_ref_id := (to_jsonb(new) ->> v_col)::uuid;

    if v_ref_id is null then
      continue;
    end if;

    execute format('select user_id from %I where id = $1', v_table)
      into v_owner using v_ref_id;

    if v_owner is null or v_owner is distinct from v_row_user then
      raise exception
        'cross-tenant reference rejected: %.% -> % %', tg_table_name, v_col, v_table, v_ref_id
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function assert_same_user() from public, anon, authenticated;

create trigger transactions_assert_same_user
before insert or update on transactions
for each row execute function assert_same_user(
  'account_id', 'accounts',
  'category_id', 'categories',
  'source_id', 'sources',
  'transfer_from_source_id', 'sources',
  'transfer_to_source_id', 'sources'
);

create trigger transaction_splits_assert_same_user
before insert or update on transaction_splits
for each row execute function assert_same_user(
  'transaction_id', 'transactions',
  'category_id', 'categories',
  'source_id', 'sources'
);

create trigger vendor_category_rules_assert_same_user
before insert or update on vendor_category_rules
for each row execute function assert_same_user(
  'category_id', 'categories',
  'source_id', 'sources'
);

create trigger source_transfers_assert_same_user
before insert or update on source_transfers
for each row execute function assert_same_user('source_id', 'sources');

create trigger forecasts_assert_same_user
before insert or update on forecasts
for each row execute function assert_same_user('source_id', 'sources');

create trigger forecast_entries_assert_same_user
before insert or update on forecast_entries
for each row execute function assert_same_user('forecast_id', 'forecasts');

create trigger accounts_assert_same_user
before insert or update on accounts
for each row execute function assert_same_user('bank_connection_id', 'bank_connections');
