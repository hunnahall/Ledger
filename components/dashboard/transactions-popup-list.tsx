"use client";

import { useEffect, useState } from "react";
import {
  getDashboardTileTransactions,
  type DashboardTileKind,
  type DashboardTileTransaction,
} from "@/lib/actions/dashboard-transactions";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

// Read-only transaction list rendered inside the dashboard's tile-click
// popup (components/ui/modal.tsx) — deliberately not the heavy, editable
// TransactionList used on the Transactions page.
export function TransactionsPopupList({
  title,
  kind,
  decimalPlaces,
}: {
  title: string;
  kind: DashboardTileKind;
  decimalPlaces: number;
}) {
  const [transactions, setTransactions] = useState<DashboardTileTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch once on mount: useModal (components/ui/modal.tsx) unmounts this
    // component entirely on close and mounts a fresh instance on the next
    // open, so `kind` never changes across the lifetime of one instance —
    // no need to track it as a dependency.
    let cancelled = false;
    getDashboardTileTransactions(kind)
      .then((rows) => {
        if (!cancelled) setTransactions(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load transactions.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-medium">{title}</p>
        {transactions && (
          <span className={`text-sm font-semibold ${total < 0 ? "text-negative" : "text-positive"}`}>
            <Money amount={total} decimalPlaces={decimalPlaces} />
          </span>
        )}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}
      {!error && !transactions && <p className="text-sm text-muted">Loading…</p>}
      {transactions && transactions.length === 0 && (
        <p className="text-sm text-muted">No transactions found.</p>
      )}

      {transactions && transactions.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="shrink-0 text-xs text-muted">{formatDate(t.postedDate)}</span>
              <span className="min-w-0 flex-1 truncate">{t.description}</span>
              <span
                className={`shrink-0 font-medium ${t.amount < 0 ? "text-negative" : "text-positive"}`}
              >
                <Money amount={t.amount} decimalPlaces={decimalPlaces} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
