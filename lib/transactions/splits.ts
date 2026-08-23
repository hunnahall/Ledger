// Shared by the split-transaction form (transaction-list.tsx, which renders
// this many split_amount_N/split_category_N/split_source_N fields) and
// saveSplits (lib/actions/transactions.ts, which reads them back) — must
// stay in sync or the server will silently ignore rows the form let the
// user fill in.
export const MAX_SPLIT_ROWS = 4;
