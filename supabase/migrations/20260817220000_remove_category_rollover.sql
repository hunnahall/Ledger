-- Rollover (per-category monthly carry-forward) was descoped: the
-- materialization logic proved buggy in testing (its ON CONFLICT upsert
-- hit a NOT NULL violation on first computation) and the feature was
-- judged not worth the added complexity for now. Removing it fully
-- rather than leaving a non-functional "Rollover" checkbox in the UI.

drop function if exists refresh_category_periods_through(uuid, date);
drop table if exists category_periods;
alter table categories drop column if exists rollover;
