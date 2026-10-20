// Split out from lib/queries/transactions.ts so client components (e.g. the
// Transactions page's column filter headers) can reference the sentinel
// without pulling in that file's createClient import — which depends on
// next/headers and is server-only, and broke the client bundle when a
// client component imported it just for this constant.
export type TransactionFilters = {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  sourceId?: string;
  uncategorizedOnly?: boolean;
  sourceIsNull?: boolean;
  search?: string;
};

// The Category filter offers "Uncategorized" as one of its own options
// rather than a separate checkbox — this sentinel is what that option
// submits, and resolveCategoryFilter below translates it back into the
// uncategorizedOnly flag the query actually uses.
export const UNCATEGORIZED_FILTER_VALUE = "__uncategorized__";

export function resolveCategoryFilter(
  categoryId: string | undefined,
): Pick<TransactionFilters, "categoryId" | "uncategorizedOnly"> {
  if (categoryId === UNCATEGORIZED_FILTER_VALUE) {
    return { uncategorizedOnly: true };
  }
  return { categoryId };
}

// Same idea as UNCATEGORIZED_FILTER_VALUE, for the Source filter.
export const NO_SOURCE_FILTER_VALUE = "__no_source__";

export function resolveSourceFilter(
  sourceId: string | undefined,
): Pick<TransactionFilters, "sourceId" | "sourceIsNull"> {
  if (sourceId === NO_SOURCE_FILTER_VALUE) {
    return { sourceIsNull: true };
  }
  return { sourceId };
}

// "Needs a Source": no Source, and neither Excluded nor Income (Income always
// carries the Income source). The same rule the "No source" filter applies
// in getFilteredTransactions, so the summary count and the filter agree.
export function needsSource(t: { sourceId: string | null; excludeFromBudget: boolean; isIncome: boolean }) {
  return t.sourceId === null && !t.excludeFromBudget && !t.isIncome;
}

// The summary line over the transactions the list currently shows:
// "248 transactions · 6 without a Source · Net −1,204.18".
export function summarizeTransactions(
  rows: { amount: number; sourceId: string | null; excludeFromBudget: boolean; isIncome: boolean }[],
) {
  let net = 0;
  let withoutSource = 0;
  for (const row of rows) {
    net += row.amount;
    if (needsSource(row)) withoutSource += 1;
  }
  return { count: rows.length, withoutSource, net: Math.round(net * 100) / 100 };
}
