-- Each user's Dashboard layout: tile order, widths and which tiles are
-- hidden (lib/dashboard-layout.ts reads and checks it). Null means the
-- default layout.
alter table public.settings add column dashboard_layout jsonb;
