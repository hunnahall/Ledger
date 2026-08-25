-- Month Ahead is now the recommended default going forward — new users
-- (and the settings row auto-created by handle_new_user on signup) start
-- with it on rather than requiring an explicit opt-in toggle.
alter table settings alter column month_ahead set default true;
