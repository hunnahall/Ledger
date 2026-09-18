-- Tracks whether a transaction's category came from the user's own pick or
-- was silently auto-filled from a learned vendor rule (on manual entry or
-- bank sync), so the UI can show which happened instead of leaving
-- auto-categorization invisible.

alter table transactions
  add column category_source text check (category_source in ('manual', 'rule'));
