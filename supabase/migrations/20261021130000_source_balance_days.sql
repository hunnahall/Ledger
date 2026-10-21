-- A Source's balance can't be rebuilt from its transactions (manual edits,
-- monthly Source Transfers, the Income sweep and reset, and sinking
-- contributions all move it without one), so the Sources popup chart needs
-- a record. One row per Source per day holds that day's closing balance; a
-- trigger on `sources` keeps today's row current whatever moved the balance.
-- About one row per Source per day, deleted after the 4-month window.
create table public.source_balance_days (
  source_id uuid not null references public.sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  balance numeric(12,2) not null,
  primary key (source_id, day)
);
create index source_balance_days_user_id_idx on public.source_balance_days (user_id);

alter table public.source_balance_days enable row level security;
create policy "own rows" on public.source_balance_days for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The day is the user's own calendar day (settings.timezone).
create or replace function public.record_source_balance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_day date;
begin
  if tg_op = 'UPDATE' and new.balance is not distinct from old.balance then
    return new;
  end if;
  v_day := (now() at time zone coalesce((select timezone from settings where user_id = new.user_id), 'UTC'))::date;
  insert into source_balance_days (source_id, user_id, day, balance)
  values (new.id, new.user_id, v_day, new.balance)
  on conflict (source_id, day) do update set balance = excluded.balance;
  return new;
end;
$$;
revoke execute on function public.record_source_balance() from public, anon, authenticated;

create trigger sources_record_balance
  after insert or update of balance on public.sources
  for each row execute function public.record_source_balance();

-- Starting point: every Source's balance as of this migration.
insert into public.source_balance_days (source_id, user_id, day, balance)
select s.id, s.user_id,
  (now() at time zone coalesce((select timezone from public.settings st where st.user_id = s.user_id), 'UTC'))::date,
  s.balance
from public.sources s
on conflict (source_id, day) do nothing;

-- Same window as transactions: the current month plus the 3 before it.
create or replace function public.purge_source_balance_days()
returns void
language sql
set search_path = public, pg_catalog
as $$
  delete from source_balance_days
  where day < (date_trunc('month', current_date) - interval '3 months')::date;
$$;
revoke execute on function public.purge_source_balance_days() from public, anon, authenticated;

select cron.schedule('purge-source-balance-days', '10 3 * * *', $$select public.purge_source_balance_days();$$);
