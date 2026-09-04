import { NextRequest, NextResponse } from "next/server";
import { getFilteredTransactions } from "@/lib/queries/transactions";
import { requireUser } from "@/lib/supabase/auth";
import {
  resolveCategoryFilter,
  resolveSourceFilter,
  type TransactionFilters,
} from "@/lib/transactions/filters";

function quoteCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Neutralize formula injection: a cell starting with =, +, -, or @ can
// execute as a formula when opened in Excel/Sheets. Only applied to
// free-text fields the user (or a bank) authored — description, category/
// source names, notes. Never applied to system-formatted fields like the
// amount or date columns, where a leading "-" is a legitimate minus sign,
// not untrusted input.
function csvEscapeText(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`;
  }
  return quoteCsv(value);
}

// "Last 30 days" is computed here (server's current date) rather than
// passed as an explicit date_from, so the export menu can offer it as a
// one-click range without the client doing its own date math.
function last30DaysStart(): string {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  return start.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  // The proxy matcher covers this route, so an unauthenticated request is
  // already redirected — but the export is the one place that hands data
  // out as a file, so it does not lean solely on that.
  await requireUser();

  const params = request.nextUrl.searchParams;
  const range = params.get("range");

  const filters: TransactionFilters = {
    dateFrom: range === "30d" ? last30DaysStart() : params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
    accountId: params.get("account_id") ?? undefined,
    search: params.get("search") ?? undefined,
    ...resolveCategoryFilter(params.get("category_id") ?? undefined),
    // This used to pass source_id straight through, so exporting while the
    // "No source" filter was active sent that filter's sentinel value
    // (__no_source__) into .eq("source_id", ...) — not a UUID, so PostgREST
    // rejected it and the export 500'd.
    ...resolveSourceFilter(params.get("source_id") ?? undefined),
  };

  const transactions = await getFilteredTransactions(filters);

  const header = [
    "Date",
    "Description",
    "Account",
    "Amount",
    "Category",
    "Source",
    "Transfer",
    "Excluded from budget",
    "Notes",
  ];

  const rows = transactions.map((t) => [
    quoteCsv(t.posted_date),
    csvEscapeText(t.description),
    csvEscapeText((t.accounts as { account_name: string } | null)?.account_name ?? ""),
    quoteCsv(t.amount.toFixed(2)),
    csvEscapeText((t.categories as { name: string } | null)?.name ?? ""),
    csvEscapeText((t.sources as { name: string } | null)?.name ?? ""),
    t.is_transfer ? "yes" : "no",
    t.exclude_from_budget ? "yes" : "no",
    csvEscapeText(t.notes ?? ""),
  ]);

  const csv = [header.map(quoteCsv), ...rows]
    .map((row) => row.join(","))
    .join("\n");

  const filenameSuffix = range === "30d" ? "-last-30-days" : "";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-transactions${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
