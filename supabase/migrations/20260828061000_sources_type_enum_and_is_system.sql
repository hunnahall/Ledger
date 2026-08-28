create type source_type as enum ('budget', 'reimbursement', 'fund', 'float', 'sinking_fund', 'income');

alter table sources add column is_system boolean not null default false;
update sources set is_system = true where type in ('budget', 'float', 'sinking_fund', 'income');

drop view v_source_balances;
drop view v_reimbursements_pending;
drop view v_float_outstanding;
drop view v_outflow_by_bucket;

alter table sources drop constraint sources_type_check;
alter table sources alter column type drop default;
alter table sources alter column type type source_type using type::source_type;
alter table sources alter column type set default 'budget'::source_type;

create unique index sources_one_system_per_type on sources (user_id, type) where is_system;

-- Recreate as it was (funds/source_funds still exist at this point in the
-- migration sequence; this view is redefined again, without that join,
-- when funds/source_funds are dropped).
create view v_source_balances
with (security_invoker = on) as
select s.id, s.user_id, s.name, s.type, s.deposit_date,
    coalesce(f.balance, s.balance) as balance
from sources s
left join source_funds sf on sf.source_id = s.id
left join funds f on f.id = sf.fund_id
where s.archived_at is null;

create view v_float_outstanding
with (security_invoker = on) as
select user_id, sum(balance) as float_outstanding
from sources
where type = 'reimbursement' and balance < 0 and archived_at is null
group by user_id;

create view v_reimbursements_pending
with (security_invoker = on) as
select id, user_id, name, balance, deposit_date
from sources
where type = 'reimbursement' and balance <> 0 and archived_at is null;

create view v_outflow_by_bucket
with (security_invoker = on) as
select user_id, month,
    case when source_type = 'budget' then 'budget' else 'other' end as bucket,
    sum(amount) as amount
from (
    select t.user_id,
        (date_trunc('month', t.posted_date::timestamp with time zone))::date as month,
        s.type as source_type,
        t.amount
    from transactions t
    left join sources s on s.id = t.source_id
    where not t.is_transfer and not t.exclude_from_budget and not t.is_split and t.amount < 0

    union all

    select ts.user_id,
        (date_trunc('month', t.posted_date::timestamp with time zone))::date as month,
        s.type as source_type,
        ts.amount
    from transaction_splits ts
    join transactions t on t.id = ts.transaction_id
    left join sources s on s.id = ts.source_id
    where not t.is_transfer and not t.exclude_from_budget and ts.amount < 0
) combined
where source_type is not null
group by user_id, month, case when source_type = 'budget' then 'budget' else 'other' end;
