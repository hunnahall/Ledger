-- Nothing reads these: zero .from() calls anywhere in app/, lib/,
-- components/ or the simplefin-sync edge function. Left over from earlier
-- dashboard iterations (v_account_balances from the original dashboard
-- views migration; the other two from the funds-into-sources merge).
drop view if exists v_account_balances;
drop view if exists v_float_outstanding;
drop view if exists v_reimbursements_pending;
