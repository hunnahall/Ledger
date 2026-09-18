-- Lets a Forecast start its projection from a value other than the
-- Source's live balance, mirroring monthly_transfer_override: nullable,
-- forecast-local, computed against at read time (see getForecast), never
-- written back to sources.balance.
alter table forecasts add column starting_balance_override numeric(12,2);
