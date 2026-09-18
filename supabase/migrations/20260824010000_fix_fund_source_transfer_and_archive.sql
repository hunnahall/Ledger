-- Bug fix: ensure_source_transfers_current credited a transfer's amount by
-- writing straight to sources.balance, bypassing sync_source_or_fund_balance
-- (the function every other balance-changing path — transactions, manual
-- adjustments — already goes through). For a fund-type Source that column is
-- dead; the balance actually shown comes from the linked funds row (see
-- getSourcesWithBalance), so a transfer into a fund-type Source was silently
-- invisible. Route it through the same function everything else uses.
create or replace function ensure_source_transfers_current(p_budget_id uuid) returns void
language plpgsql as $$
declare
  v_row record;
  v_source_type text;
  v_fund_id uuid;
  v_old_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_source_name text;
  v_current_month date := date_trunc('month', now())::date;
begin
  for v_row in
    select id, user_id, source_id, name, amount
    from source_transfers
    where budget_id = p_budget_id
      and (last_applied_month is distinct from v_current_month)
  loop
    select type, name into v_source_type, v_source_name
    from sources where id = v_row.source_id;

    if v_source_type is null then
      -- Source Transfer's Source was deleted out from under it; skip
      -- rather than error the whole budget page.
      continue;
    end if;

    if v_source_type = 'fund' then
      select fund_id into v_fund_id from source_funds where source_id = v_row.source_id;
      select balance into v_old_balance from funds where id = v_fund_id;
    else
      select balance into v_old_balance from sources where id = v_row.source_id;
    end if;

    perform sync_source_or_fund_balance(v_row.source_id, v_row.amount);

    if v_source_type = 'fund' then
      select balance into v_new_balance from funds where id = v_fund_id;
    else
      select balance into v_new_balance from sources where id = v_row.source_id;
    end if;

    update source_transfers set last_applied_month = v_current_month
    where id = v_row.id;

    insert into activity_log (user_id, page, variable, old_value, new_value)
    values (
      v_row.user_id,
      'Sources',
      v_source_name || ' balance (Source Transfer: ' || v_row.name || ')',
      v_old_balance::text,
      v_new_balance::text
    );
  end loop;
end;
$$;
alter function ensure_source_transfers_current(uuid) set search_path = public;

-- Archiving a Fund must also archive its linked Source (see createSource: a
-- Fund-type Source always owns exactly one Fund, created together). Without
-- this, the Source lingers active and still selectable elsewhere (e.g. a new
-- Source Transfer) with nothing displaying a balance for it anymore, since
-- the Fund it pointed at is gone. One function so both updates commit
-- atomically instead of an application-side archiveFund racing a partial
-- failure between two separate client calls.
create or replace function archive_fund(p_fund_id uuid) returns void
language plpgsql as $$
declare
  v_source_id uuid;
begin
  update funds set archived_at = now() where id = p_fund_id;

  select source_id into v_source_id from source_funds where fund_id = p_fund_id;
  if v_source_id is not null then
    update sources set archived_at = now() where id = v_source_id;
  end if;
end;
$$;
alter function archive_fund(uuid) set search_path = public;
revoke execute on function archive_fund(uuid) from public, anon;
grant execute on function archive_fund(uuid) to authenticated;
