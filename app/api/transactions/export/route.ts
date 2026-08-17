import { NextRequest, NextResponse } from "next/server";
import { getFilteredTransactions, type TransactionFilters } from "@/lib/queries/transactions";

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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters: TransactionFilters = {
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
    accountId: params.get("account_id") ?? undefined,
    categoryId: params.get("category_id") ?? undefined,
    sourceId: params.get("source_id") ?? undefined,
    uncategorizedOnly: params.get("uncategorized") === "on",
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

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
