# Ledger

A personal budgeting app: every transaction gets a **Category** (what it is) and a **Source** (what pays for it). Supports monthly budgets, sinking funds, present/future source balances, and bank sync via SimpleFin.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Edge Functions, Vault)
- SimpleFin for bank account sync

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/(auth)      login / signup
app/(app)       dashboard, transactions, accounts, budgets, sources, settings
lib/supabase    browser / server / middleware Supabase clients
lib/actions     server actions
lib/queries     typed data-fetching wrappers
supabase/       migrations + edge functions (simplefin-sync)
```
