-- adjustSourceBalance/adjustFundBalance (lib/actions/sources.ts) used to
-- read balance, then write balance + amount as a separate statement — two
-- concurrent adjustments on the same row (double-submit, two tabs) could
-- race and silently drop one of them. These do the increment atomically in
-- a single UPDATE instead, mirroring sync_source_or_fund_balance's
-- balance = balance + delta pattern. Runs as the invoking user (not
-- security definer) — RLS "own rows" already restricts each UPDATE to the
-- caller's own sources/funds rows, so a missing/not-owned id just matches
-- zero rows rather than needing an explicit ownership check.

create or replace function adjust_source_balance(p_source_id uuid, p_delta numeric)
returns numeric
language plpgsql as $$
declare
  v_balance numeric(12,2);
begin
  update sources set balance = balance + p_delta
  where id = p_source_id
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'source not found';
  end if;

  return v_balance;
end;
$$;
alter function adjust_source_balance(uuid, numeric) set search_path = public;
revoke execute on function adjust_source_balance(uuid, numeric) from public, anon;
grant execute on function adjust_source_balance(uuid, numeric) to authenticated;

create or replace function adjust_fund_balance(p_fund_id uuid, p_delta numeric)
returns numeric
language plpgsql as $$
declare
  v_balance numeric(12,2);
begin
  update funds set balance = balance + p_delta
  where id = p_fund_id
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'fund not found';
  end if;

  return v_balance;
end;
$$;
alter function adjust_fund_balance(uuid, numeric) set search_path = public;
revoke execute on function adjust_fund_balance(uuid, numeric) from public, anon;
grant execute on function adjust_fund_balance(uuid, numeric) to authenticated;
