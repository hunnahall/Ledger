-- Triggers & functions: updated_at maintenance, budget cap (max 10),
-- split-sum integrity, and auto-provisioning a settings row on signup.

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at before update on accounts for each row execute function set_updated_at();
create trigger budgets_set_updated_at before update on budgets for each row execute function set_updated_at();
create trigger categories_set_updated_at before update on categories for each row execute function set_updated_at();
create trigger category_periods_set_updated_at before update on category_periods for each row execute function set_updated_at();
create trigger sources_set_updated_at before update on sources for each row execute function set_updated_at();
create trigger source_contributions_set_updated_at before update on source_contributions for each row execute function set_updated_at();
create trigger transactions_set_updated_at before update on transactions for each row execute function set_updated_at();
create trigger transaction_splits_set_updated_at before update on transaction_splits for each row execute function set_updated_at();
create trigger vendor_category_rules_set_updated_at before update on vendor_category_rules for each row execute function set_updated_at();
create trigger settings_set_updated_at before update on settings for each row execute function set_updated_at();

-- Max 10 budgets per user (partial unique index in the prior migration
-- already enforces "exactly one is_current").
create or replace function enforce_budget_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from budgets where user_id = new.user_id) >= 10 then
    raise exception 'Maximum of 10 budgets per user';
  end if;
  return new;
end;
$$;

create trigger budgets_enforce_limit before insert on budgets for each row execute function enforce_budget_limit();

-- Split amounts must sum to their parent transaction's amount. Deferred so
-- all splits for one transaction can be inserted before this is checked.
create or replace function check_split_sum() returns trigger
language plpgsql as $$
declare
  txn_id uuid := coalesce(new.transaction_id, old.transaction_id);
  txn_amount numeric(12,2);
  split_total numeric(12,2);
begin
  select amount into txn_amount from transactions where id = txn_id;
  select coalesce(sum(amount), 0) into split_total from transaction_splits where transaction_id = txn_id;
  if txn_amount is not null and split_total <> txn_amount then
    raise exception 'Split amounts (%) must sum to transaction amount (%)', split_total, txn_amount;
  end if;
  return null;
end;
$$;

create constraint trigger transaction_splits_sum_check
after insert or update or delete on transaction_splits
deferrable initially deferred
for each row execute function check_split_sum();

-- Auto-create a settings row (decimal_places default 2) when a user signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
