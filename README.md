# Ledger

A budgeting app that replaces a spreadsheet budget. Transactions come in from the bank. Each one is paid for by a **Source** (a bucket of spendable money: the Budget, the Sinking Fund, Float, Income, or one you make) and, when it comes out of the Budget, gets a **Category**. A budget is its Categories, Sinking Expenses and Source Transfers; it runs **Rolling** (this month's income pays for this month) or **Advanced** (this month's income pays for next month).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Supabase: Postgres with row-level security, Auth, one Edge Function, Vault, pg_cron
- SimpleFin for bank sync (manual: Sync and Import buttons only)
- Vitest for the pure logic in `lib/`

This Next.js version has breaking changes from older releases. Read [AGENTS.md](AGENTS.md) and the guides in `node_modules/next/dist/docs/` before changing framework code.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-up is invite only (`public.signup_allowlist`).

```bash
npm test          # Vitest
npm run lint      # ESLint
npx tsc --noEmit  # typecheck
npm run build     # production build
```

## Project structure

```
app/(auth)                    login, signup, forgot and reset password
app/(app)                     dashboard, transactions, budget, sources, accounts,
                              forecasts, plus log, rules and settings (the More menu)
app/api/transactions/export   CSV export of the Transactions list
app/auth/callback             email link sign-in (confirmation, password reset)
components/<area>             one folder per page area; components/ui holds shared pieces
lib/actions                   server actions (every write)
lib/queries                   typed reads, one file per area
lib/accounts, budget, forecast, sources, transactions
                              pure logic with Vitest tests next to it
lib/supabase                  server and middleware clients, generated database types
supabase/migrations           schema, views, triggers and functions
supabase/functions/simplefin-sync   the bank sync Edge Function
```

Project docs (status, architecture, roadmap, the dashboard equations) live outside the repo, in the ProjectsDB vault.
