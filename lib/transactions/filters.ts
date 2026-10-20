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

// "Needs a Source": no Source, and not Excluded, Income or a transfer.
// Income always carries the Income source, and a transfer never takes one
// (giving it a Source ends the transfer). The same rule the "No source"
// filter and the nav badge apply, so all three agree.
type SourceCheck = { sourceId: string | null; excludeFromBudget: boolean; isIncome: boolean; isTransfer: boolean };

function needsSource(t: SourceCheck) {
  return t.sourceId === null && !t.excludeFromBudget && !t.isIncome && !t.isTransfer;
}

// The summary line over the transactions the list currently shows:
// "248 transactions · 6 without a Source · Net −1,204.18".
export function summarizeTransactions(rows: (SourceCheck & { amount: number })[]) {
  let net = 0;
  let withoutSource = 0;
  for (const row of rows) {
    net += row.amount;
    if (needsSource(row)) withoutSource += 1;
  }
  return { count: rows.length, withoutSource, net: Math.round(net * 100) / 100 };
}

// A search term that reads as an amount ("12.50", "$1,204.18", "-40"), as a
// positive magnitude, or null. Matched against both signs, since the list
// shows money out as negative but people type it without the minus.
export function parseSearchAmount(term: string): number | null {
  const cleaned = term.trim().replace(/^[−-]/, "").replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

// A value inside a PostgREST or() filter, double-quoted so commas, periods
// and parentheses in the search term can't break the filter's syntax.
function quoteFilterValue(value: string) {
  return `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

// The or() filter for the Transactions search: description, notes and the
// normalized merchant contain the term; the amount equals it (either sign)
// when it reads as one; or the Category or Source name matches (the caller
// resolves names to ids first).
export function searchOrFilter(
  term: string,
  { categoryIds = [], sourceIds = [] }: { categoryIds?: string[]; sourceIds?: string[] } = {},
): string {
  // % and _ are LIKE wildcards; a search for "50% off" means the literal
  // characters.
  const like = quoteFilterValue(`%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  const parts = [`description.ilike.${like}`, `notes.ilike.${like}`, `merchant_normalized.ilike.${like}`];
  const amount = parseSearchAmount(term);
  if (amount !== null) parts.push(`amount.eq.${amount}`, `amount.eq.${-amount}`);
  if (categoryIds.length > 0) parts.push(`category_id.in.(${categoryIds.join(",")})`);
  if (sourceIds.length > 0) parts.push(`source_id.in.(${sourceIds.join(",")})`);
  return parts.join(",");
}
