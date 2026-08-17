import { NextRequest, NextResponse } from "next/server";
import { getFilteredTransactions, type TransactionFilters } from "@/lib/queries/transactions";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
    t.posted_date,
    t.description,
    (t.accounts as { account_name: string } | null)?.account_name ?? "",
    t.amount.toFixed(2),
    (t.categories as { name: string } | null)?.name ?? "",
    (t.sources as { name: string } | null)?.name ?? "",
    t.is_transfer ? "yes" : "no",
    t.exclude_from_budget ? "yes" : "no",
    t.notes ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
