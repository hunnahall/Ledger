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
