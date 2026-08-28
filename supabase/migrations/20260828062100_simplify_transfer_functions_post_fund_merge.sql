create or replace function transactions_sync_transfer_balance() returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_old_delta numeric;
  v_new_delta numeric;
begin
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
$function$;

create or replace function ensure_source_transfers_current(p_budget_id uuid) returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_row record;
  v_source_type text;
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
    select type, name, balance into v_source_type, v_source_name, v_old_balance
    from sources where id = v_row.source_id;

    if v_source_type is null then
      -- Source Transfer's Source was deleted out from under it; skip
      -- rather than error the whole budget page.
      continue;
    end if;

    perform sync_source_or_fund_balance(v_row.source_id, v_row.amount);

    select balance into v_new_balance from sources where id = v_row.source_id;

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
$function$;
