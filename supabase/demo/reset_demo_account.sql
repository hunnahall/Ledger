-- Resets the demo account (demo@example.com) and fills it with made-up data
-- for marketing images and sharing: a young family (Sam, Jordan and their
-- daughter Maya) on an Advanced budget. Dates are relative to today, so
-- rerunning it moves everything forward; run it again whenever the demo goes
-- stale (retention deletes transactions older than four months).
--
-- Run it as the database owner (Supabase SQL editor, or Claude via
-- execute_sql). It only touches the demo user's rows. Randomness is seeded,
-- so the same day always gives the same data.

do $$
declare
  v_email constant text := 'demo@example.com';
  v_user uuid;
  v_today date := current_date;
  m0 date := date_trunc('month', current_date)::date;
  ms date;
  i int;
  k int;
  v_budget uuid;
  v_income uuid;
  v_float uuid;
  v_sinking uuid;
  v_travel uuid;
  v_forecast uuid;
  v_allocation numeric(12,2);
  v_payment numeric(12,2);
begin
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'No user with email %. Create it first (Supabase dashboard, Authentication, Add user).', v_email;
  end if;

  perform setseed(0.42);

  -- Wipe everything the demo user has, keeping the four system sources.
  delete from transactions where user_id = v_user;
  delete from rules where user_id = v_user;
  delete from forecasts where user_id = v_user;
  delete from source_transfers where user_id = v_user;
  delete from sinking_expenses where user_id = v_user;
  delete from categories where user_id = v_user;
  delete from accounts where user_id = v_user;
  delete from monthly_totals where user_id = v_user;
  delete from sources where user_id = v_user and not is_system;

  update settings
  set budget_type = 'advanced', timezone = 'America/Chicago', decimal_places = 2, dashboard_layout = null
  where user_id = v_user;

  select id into v_budget from sources where user_id = v_user and type = 'budget';
  select id into v_income from sources where user_id = v_user and type = 'income';
  select id into v_float from sources where user_id = v_user and type = 'float';
  select id into v_sinking from sources where user_id = v_user and type = 'sinking_fund';

  insert into accounts (user_id, account_name, account_type, institution_name, last4, is_manual) values
    (v_user, 'Everyday Checking', 'checking', 'Riverside Credit Union', '4821', true),
    (v_user, 'Rewards Visa', 'credit_card', 'Riverside Credit Union', '9034', true),
    (v_user, 'High-Yield Savings', 'savings', 'Ally Bank', '7710', true);

  insert into sources (user_id, name, type) values
    (v_user, 'Emergency Fund', 'fund'),
    (v_user, 'Travel', 'fund'),
    (v_user, 'House Projects', 'fund'),
    (v_user, 'Maya', 'fund'),
    (v_user, 'Work Expenses', 'reimbursement');
  select id into v_travel from sources where user_id = v_user and name = 'Travel';

  insert into categories (user_id, name, monthly_amount, sort_order) values
    (v_user, 'Mortgage', 1850, 1),
    (v_user, 'Groceries', 900, 2),
    (v_user, 'Childcare', 1200, 3),
    (v_user, 'Dining Out', 300, 4),
    (v_user, 'Utilities', 280, 5),
    (v_user, 'Transportation', 220, 6),
    (v_user, 'Subscriptions', 60, 7),
    (v_user, 'Giving', 400, 8),
    (v_user, 'Kids', 200, 9),
    (v_user, 'Household', 150, 10),
    (v_user, 'Personal Care', 100, 11),
    (v_user, 'Fun', 150, 12);

  insert into sinking_expenses (user_id, name, amount, frequency, contribution_type, target_amount, target_date, contributed_to_date) values
    (v_user, 'Car insurance', 1080, 'semiannual', 'frequency', null, null, 720),
    (v_user, 'Home insurance', 1620, 'annual', 'frequency', null, null, 540),
    (v_user, 'Amazon Prime', 139, 'annual', 'frequency', null, null, 46.33),
    (v_user, 'Holiday gifts', 0, null, 'goal', 1200, (m0 + interval '2 months')::date, 600);

  insert into source_transfers (user_id, source_id, name, amount, last_applied_month)
  select v_user, s.id, s.name, t.amount, m0
  from (values ('Emergency Fund', 400), ('Travel', 300), ('House Projects', 250), ('Maya', 100)) as t(name, amount)
  join sources s on s.user_id = v_user and s.name = t.name;

  -- Transactions are staged here by name, then inserted in one go.
  create temp table demo_tx (
    d date, amt numeric(12,2), descr text, acct text, cat text, src text,
    income boolean default false, transfer boolean default false, notes text, status text default 'posted'
  ) on commit drop;

  for i in 0..3 loop
    ms := (m0 - make_interval(months => i))::date;

    -- Paychecks on the 1st and 15th, into checking.
    insert into demo_tx (d, amt, descr, acct, income) values
      (ms, 2450.00, 'ACME CORP PAYROLL', 'chk', true),
      (ms, 1462.18, 'RIVERSIDE SCHOOLS PAYROLL', 'chk', true),
      (ms + 14, 2450.00, 'ACME CORP PAYROLL', 'chk', true),
      (ms + 14, 1462.18, 'RIVERSIDE SCHOOLS PAYROLL', 'chk', true);

    -- Bills from checking.
    insert into demo_tx (d, amt, descr, acct, cat, src) values
      (ms, -1850.00, 'ROCKET MORTGAGE PMT', 'chk', 'Mortgage', 'Budget'),
      (ms + 1, -600.00, 'BRIGHT HORIZONS TUITION', 'chk', 'Childcare', 'Budget'),
      (ms + 15, -600.00, 'BRIGHT HORIZONS TUITION', 'chk', 'Childcare', 'Budget'),
      (ms + 2, -400.00, 'GRACE CHURCH ONLINE GIVING', 'chk', 'Giving', 'Budget'),
      (ms + 6, -round((58 + random() * 20)::numeric, 2), 'CITY OF RIVERSIDE WATER', 'chk', 'Utilities', 'Budget'),
      (ms + 9, -round((105 + random() * 55)::numeric, 2), 'RIVERSIDE ELECTRIC CO', 'chk', 'Utilities', 'Budget'),
      (ms + 11, -80.00, 'XFINITY INTERNET', 'visa', 'Utilities', 'Budget'),
      (ms + 3, -15.49, 'NETFLIX.COM', 'visa', 'Subscriptions', 'Budget'),
      (ms + 7, -16.99, 'SPOTIFY USA', 'visa', 'Subscriptions', 'Budget'),
      (ms + 12, -9.99, 'APPLE.COM/BILL', 'visa', 'Subscriptions', 'Budget'),
      (ms + 18, -4.00, 'NYTIMES DIGITAL', 'visa', 'Subscriptions', 'Budget'),
      (ms + 8, -85.00, 'RIVERSIDE YMCA SWIM', 'visa', 'Kids', 'Budget');

    -- Savings transfer and the card payment (transfers: no Source).
    v_payment := round((1700 + random() * 600)::numeric, 2);
    insert into demo_tx (d, amt, descr, acct, transfer) values
      (ms + 4, -1050.00, 'TRANSFER TO SAVINGS 7710', 'chk', true),
      (ms + 4, 1050.00, 'TRANSFER FROM CHECKING 4821', 'sav', true),
      (ms + 20, -v_payment, 'RIVERSIDE CU VISA PAYMENT', 'chk', true),
      (ms + 20, v_payment, 'PAYMENT THANK YOU', 'visa', true);

    -- Everyday spending on the card.
    for k in 0..9 loop
      insert into demo_tx (d, amt, descr, acct, cat, src) values (
        ms + least(27, floor(k * 2.8 + random() * 2)::int),
        -round((32 + random() * 125)::numeric, 2),
        (array['TRADER JOE''S #512', 'WHOLE FOODS MKT 10233', 'COSTCO WHSE #1043', 'KROGER #221'])[1 + floor(random() * 4)::int],
        'visa', 'Groceries', 'Budget');
    end loop;
    for k in 0..6 loop
      insert into demo_tx (d, amt, descr, acct, cat, src) values (
        ms + least(27, floor(k * 4 + random() * 3)::int),
        -round((9 + random() * 52)::numeric, 2),
        (array['CHIPOTLE 2291', 'SWEETGREEN RIVERSIDE', 'LOCAL GROUNDS COFFEE', 'PIZZA PALACE', 'PHO SAIGON'])[1 + floor(random() * 5)::int],
        'visa', 'Dining Out', 'Budget');
    end loop;
    for k in 0..2 loop
      insert into demo_tx (d, amt, descr, acct, cat, src) values (
        ms + least(27, floor(k * 9 + random() * 4)::int),
        -round((38 + random() * 24)::numeric, 2),
        (array['SHELL OIL 57442', 'EXXONMOBIL 4410'])[1 + floor(random() * 2)::int],
        'visa', 'Transportation', 'Budget');
    end loop;
    insert into demo_tx (d, amt, descr, acct, cat, src) values
      (ms + 16, -round((12 + random() * 20)::numeric, 2), 'CITY PARKING METER', 'visa', 'Transportation', 'Budget'),
      (ms + 10, -28.00, 'GREAT CLIPS #8812', 'visa', 'Personal Care', 'Budget'),
      (ms + 21, -round((14 + random() * 40)::numeric, 2), 'CVS/PHARMACY #0921', 'visa', 'Personal Care', 'Budget'),
      (ms + 5, -round((25 + random() * 60)::numeric, 2), 'TARGET 00012345', 'visa', 'Kids', 'Budget'),
      (ms + 19, -round((20 + random() * 40)::numeric, 2), 'TARGET 00012345', 'visa', 'Kids', 'Budget'),
      (ms + 13, -round((18 + random() * 70)::numeric, 2), 'AMAZON MKTPL', 'visa', 'Household', 'Budget'),
      (ms + 23, -round((15 + random() * 45)::numeric, 2), 'THE HOME DEPOT #6521', 'visa', 'Household', 'Budget'),
      (ms + 12, -round((34 + random() * 18)::numeric, 2), 'AMC THEATRES', 'visa', 'Fun', 'Budget'),
      (ms + 24, -45.00, 'RIVERSIDE ZOO', 'visa', 'Fun', 'Budget');
  end loop;

  -- One-offs from the other Sources, three months ago through this month.
  ms := (m0 - interval '3 months')::date;
  insert into demo_tx (d, amt, descr, acct, src, notes) values
    (ms + 9, -540.00, 'STATE FARM AUTO', 'chk', 'Sinking Fund', 'Car insurance, first half'),
    (ms + 17, -350.00, 'SUNNY DAYS SUMMER CAMP', 'visa', 'Maya', 'Two weeks of day camp');

  ms := (m0 - interval '2 months')::date;
  insert into demo_tx (d, amt, descr, acct, src, notes) values
    (ms + 4, -684.40, 'DELTA AIR LINES', 'visa', 'Travel', 'Flights to the coast'),
    (ms + 21, -542.18, 'MARRIOTT HOTELS', 'visa', 'Travel', null),
    (ms + 21, -213.77, 'HERTZ RENT-A-CAR', 'visa', 'Travel', null),
    (ms + 22, -96.40, 'SEASIDE CRAB SHACK', 'visa', 'Travel', null);

  ms := (m0 - interval '1 month')::date;
  insert into demo_tx (d, amt, descr, acct, src, notes) values
    (ms + 8, -642.90, 'MIDTOWN AUTO REPAIR', 'chk', 'Emergency Fund', 'New brakes and rotors'),
    (ms + 12, -418.32, 'THE HOME DEPOT #6521', 'visa', 'House Projects', 'Fence boards'),
    (ms + 19, -176.45, 'LOWE''S #1180', 'visa', 'House Projects', 'Stain and brushes'),
    (ms + 16, -412.60, 'HILTON CHICAGO', 'visa', 'Work Expenses', 'Conference hotel, expensed'),
    (ms + 23, -139.00, 'AMAZON PRIME*2K4', 'visa', 'Sinking Fund', null);

  insert into demo_tx (d, amt, descr, acct, src, notes) values
    (m0 + 2, -318.00, 'AIRBNB HMVXQ2', 'visa', 'Travel', 'Cabin for Thanksgiving'),
    (m0 + 3, -184.00, 'TICKETMASTER', 'visa', 'Float', 'Concert tickets for Alex and Priya'),
    (m0 + 5, 412.60, 'ACME CORP EXPENSE REIMB', 'chk', 'Work Expenses', null),
    (m0 + 8, 92.00, 'VENMO CASHOUT ALEX', 'chk', 'Float', 'Alex paid back his half');

  -- Recent rows waiting for a Source, and one pending charge.
  insert into demo_tx (d, amt, descr, acct, src, cat, status) values
    (v_today - 1, -42.00, 'RIVERSIDE FARMERS MARKET', 'visa', null, null, 'posted'),
    (v_today - 2, -38.50, 'PETCO 1187', 'visa', null, null, 'posted'),
    (v_today, -6.45, 'LOCAL GROUNDS COFFEE', 'visa', 'Budget', 'Dining Out', 'pending');

  insert into transactions (
    user_id, account_id, posted_date, amount, description, merchant_normalized,
    category_id, category_source, source_id, is_income, is_transfer, notes, status
  )
  select
    v_user, a.id, t.d, t.amt, t.descr,
    (select string_agg(tok, ' ' order by n)
       from regexp_split_to_table(regexp_replace(lower(t.descr), '[^a-z0-9\s]', ' ', 'g'), '\s+')
            with ordinality as x(tok, n)
      where tok <> '' and tok !~ '^\d+$'),
    c.id, case when c.id is null then null else 'manual' end, s.id, t.income, t.transfer, t.notes, t.status
  from demo_tx t
  join accounts a on a.user_id = v_user and a.account_name = case t.acct
    when 'chk' then 'Everyday Checking' when 'visa' then 'Rewards Visa' else 'High-Yield Savings' end
  left join categories c on c.user_id = v_user and c.name = t.cat
  left join sources s on s.user_id = v_user and s.name = t.src
  where t.d <= v_today
  order by t.d;

  insert into rules (user_id, merchant_normalized, category_id, source_id, is_income, use_count)
  select v_user, r.pattern, c.id, s.id, r.income, r.uses
  from (values
    ('trader joe s', 'Groceries', null, false, 14),
    ('whole foods mkt', 'Groceries', null, false, 9),
    ('costco whse', 'Groceries', null, false, 8),
    ('rocket mortgage', 'Mortgage', null, false, 4),
    ('bright horizons', 'Childcare', null, false, 8),
    ('grace church', 'Giving', null, false, 4),
    ('netflix com', 'Subscriptions', null, false, 4),
    ('spotify', 'Subscriptions', null, false, 4),
    ('xfinity', 'Utilities', null, false, 4),
    ('acme corp payroll', null, null, true, 8),
    ('riverside schools payroll', null, null, true, 8),
    ('airbnb', null, 'Travel', false, 2)
  ) as r(pattern, cat, src, income, uses)
  left join categories c on c.user_id = v_user and c.name = r.cat
  left join sources s on s.user_id = v_user and s.name = r.src;

  -- Rows a rule covers read as filled in by that rule.
  update transactions t
  set category_source = 'rule'
  from rules r
  where t.user_id = v_user and r.user_id = v_user and r.category_id = t.category_id
    and position(r.merchant_normalized in t.merchant_normalized) > 0;

  -- Balances. Accounts and funds are set outright; Budget is last month's
  -- income (swept in on the 1st) less this month's commitments and Budget
  -- spending so far; Income is this month's paychecks so far.
  update accounts set current_balance = case account_name
      when 'Everyday Checking' then 4812.37 when 'Rewards Visa' then -1946.20 else 18240.55 end
  where user_id = v_user;

  update sources s set balance = b.balance, last_applied_month = m0
  from (values
    ('Emergency Fund', 11357.10), ('Travel', 1182.00), ('House Projects', 1655.23),
    ('Maya', 450.00), ('Work Expenses', 0.00), ('Sinking Fund', 1346.25), ('Float', -92.00)
  ) as b(name, balance)
  where s.user_id = v_user and s.name = b.name;

  select
    (select sum(monthly_amount) from categories where user_id = v_user)
    + (select sum(case
          when contribution_type = 'goal' then greatest(0, target_amount - contributed_to_date) / 2
          when frequency = 'quarterly' then amount / 3
          when frequency = 'semiannual' then amount / 6
          else amount / 12 end)
       from sinking_expenses where user_id = v_user)
    + (select sum(amount) from source_transfers where user_id = v_user)
  into v_allocation;

  update sources set last_applied_month = m0, balance =
      (select coalesce(sum(amount), 0) from transactions
        where user_id = v_user and is_income and posted_date >= m0 - interval '1 month' and posted_date < m0)
    - (select sum(amount) from source_transfers where user_id = v_user)
    - (v_allocation - (select sum(monthly_amount) from categories where user_id = v_user)
                    - (select sum(amount) from source_transfers where user_id = v_user))
    + (select coalesce(sum(amount), 0) from transactions
        where user_id = v_user and source_id = v_budget and posted_date >= m0)
  where id = v_budget;

  update sources set last_applied_month = m0, balance =
      (select coalesce(sum(amount), 0) from transactions where user_id = v_user and is_income and posted_date >= m0)
  where id = v_income;

  -- A saved allocation for each kept month, as ensure_month_current writes.
  insert into monthly_totals (user_id, month, kind, amount)
  select v_user, (m0 - make_interval(months => n))::date, 'allocation', v_allocation
  from generate_series(0, 3) as n;

  insert into forecasts (user_id, name, source_id) values (v_user, 'Next year''s trips', v_travel)
  returning id into v_forecast;
  insert into forecast_entries (user_id, forecast_id, month, description, is_expense, amount) values
    (v_user, v_forecast, (m0 + interval '2 months')::date, 'Holiday flights', true, 900),
    (v_user, v_forecast, (m0 + interval '5 months')::date, 'Spring break rental', true, 1200),
    (v_user, v_forecast, (m0 + interval '8 months')::date, 'Beach week', true, 2100);

  delete from activity_log where user_id = v_user;
end
$$;
