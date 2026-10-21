"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardTileTransactions,
  type DashboardTileKind,
  type DashboardTileTransaction,
} from "@/lib/actions/dashboard-transactions";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

// Read-only transaction list rendered inside the dashboard's tile-click
// popup (components/ui/modal.tsx) — deliberately not the heavy, editable
// TransactionList used on the Transactions page. Each row links there: the
// Transactions page scrolls to it and flags it for a moment.
export function TransactionsPopupList({
  title,
  kind,
  months,
  decimalPlaces,
}: {
  title: string;
  kind: DashboardTileKind;
  months: string[];
  decimalPlaces: number;
}) {
  const [transactions, setTransactions] = useState<DashboardTileTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // useModal (components/ui/modal.tsx) unmounts this component entirely
    // on close and mounts a fresh instance on the next open, so kind and
    // months are fixed for the lifetime of one instance — listing them
    // below is honest about what's read without causing a refetch.
    let cancelled = false;
    getDashboardTileTransactions(kind, months)
      .then((rows) => {
        if (!cancelled) setTransactions(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load transactions.");
      });
    return () => {
      cancelled = true;
    };
  }, [kind, months]);

  const total = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-medium">{title}</p>
        {transactions && (
          <span className={"text-sm font-semibold"}>
            <Money amount={total} decimalPlaces={decimalPlaces} />
          </span>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !transactions && <p className="text-sm text-muted">Loading</p>}
      {transactions && transactions.length === 0 && (
        <p className="text-sm text-muted">No transactions found.</p>
      )}

      {transactions && transactions.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id}>
              <Link
                href={`/transactions?txn=${t.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
              >
                <span className="shrink-0 text-xs text-muted">{formatDate(t.postedDate)}</span>
                <span className="min-w-0 flex-1 truncate">{t.description}</span>
                <span className="shrink-0 font-medium">
                  <Money amount={t.amount} decimalPlaces={decimalPlaces} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
