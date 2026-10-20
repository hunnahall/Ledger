-- Safe to Spend and Count as cash are gone (Hunter's call, 2026-10-20). Both
-- compared account balances with Source balances, which only works when
-- every account is connected; most people (Hunter included) don't connect
-- them all, so the comparison was off by whatever sat in the rest. The
-- Dashboard's money map now reads Source balances alone.
alter table public.accounts drop column include_in_cash;
