"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSourceDetail, type SourceDetail } from "@/lib/actions/source-detail";
import { formatDate, formatMoney } from "@/lib/format";
import { BalanceChart } from "@/components/charts/balance-chart";
import { ChartTitle } from "@/components/charts/chart-title";
import { Money } from "@/components/ui/money";

// The Sources page's popup: the Source's balance over the kept window, then
// the transactions behind it. Each row links to that transaction in the
// Transactions list. Mounted fresh on each open (useModal), so it reads once.
export function SourcePopup({
  sourceId,
  name,
  decimalPlaces,
}: {
  sourceId: string;
  name: string;
  decimalPlaces: number;
}) {
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSourceDetail(sourceId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load this Source.");
      });
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const estimatedDays = detail?.series.filter((p) => p.estimated).length ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{name}</h2>
        {detail && <Money amount={detail.balance} decimalPlaces={decimalPlaces} className="text-xl font-semibold" />}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !detail && <p className="text-sm text-muted">Loading</p>}

      {detail && (
        <>
          <ChartTitle>Balance</ChartTitle>
          <div className="mt-3">
            <BalanceChart
              points={detail.series}
              formatValue={(v) => formatMoney(v, decimalPlaces)}
              ariaLabel={`${name} balance by day`}
            />
          </div>
          {estimatedDays > 0 && (
            <p className="mt-2 font-mono text-[11px] text-muted">
              Dashed days are estimated from transactions and the Log. Ledger started recording this balance on{" "}
              {formatDate(detail.series[estimatedDays].date)}.
            </p>
          )}

          <div className="mb-2 mt-6 flex items-baseline justify-between">
            <ChartTitle>Transactions</ChartTitle>
            <Link
              href={`/transactions?source_id=${sourceId}`}
              className="text-xs text-accent underline underline-offset-2"
            >
              View in Transactions
            </Link>
          </div>
          {detail.transactions.length === 0 ? (
            <p className="text-sm text-muted">No transactions in this window.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {detail.transactions.map((t) => (
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
        </>
      )}
    </div>
  );
}
