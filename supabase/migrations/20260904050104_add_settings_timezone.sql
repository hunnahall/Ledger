-- "What month is it" was computed in UTC on both sides (lib/dates.ts's
-- getUTCFullYear/getUTCMonth, and date_trunc('month', now()) here). For any
-- user west of UTC that makes the last several hours of each local month
-- already "next month", so the monthly budget reset, income sweep and
-- sinking contribution all fire early the moment a page is loaded in that
-- window. Store each user's IANA zone and derive the month from it.
alter table settings
  add column timezone text not null default 'UTC';

-- A CHECK can't subquery pg_timezone_names, so validate on write instead.
-- Keeps an unresolvable zone out no matter which path sets it, which
-- matters because `now() at time zone <bad>` throws -- inside the month
-- roll that would take down every page that calls it.
create or replace function settings_validate_timezone() returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone: %', new.timezone
      using errcode = 'invalid_parameter_value';
  end if;
  return new;
end;
$$;

create trigger settings_validate_timezone_trigger
before insert or update of timezone on settings
for each row execute function settings_validate_timezone();

revoke execute on function settings_validate_timezone() from public, anon, authenticated;
