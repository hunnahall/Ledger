-- Safe to Spend compares cash in accounts with the sum of every Source
-- balance. Every account counts toward that cash unless the user turns it
-- off on the Accounts page (an investment or loan account, say). Credit
-- cards count by default: their (negative) balance is money already spent
-- that the checking account still holds.
alter table accounts add column include_in_cash boolean not null default true;
