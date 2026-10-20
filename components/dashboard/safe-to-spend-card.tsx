"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { useModal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { LocalTimestamp } from "@/components/ui/local-timestamp";
import { cn } from "@/lib/cn";

type SafeToSpend = {
  amount: number;
  budgetBalance: number;
  unassigned: number;
  sourcesTotal: number;
  accounts: { id: string; name: string; balance: number }[];
  lastSyncedAt: string | null;
};

// Safe to Spend = what's left in the Budget + unassigned cash (when there is
// any). Unassigned is cash in the counted accounts minus every Source
// balance, which should be 0; when it isn't, the gap shows under the figure.
// A current figure like Float, so it ignores the selected month.
export function SafeToSpendCard({ data, decimalPlaces }: { data: SafeToSpend; decimalPlaces: number }) {
  const { open, close, modal } = useModal();
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const cash = data.accounts.reduce((sum, a) => sum + a.balance, 0);
  const gapLabel =
    data.unassigned > 0 ? `${money(data.unassigned)} unassigned` : `${money(-data.unassigned)} over-assigned`;

  function openBreakdown() {
    open(
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <h2 className="text-xl font-semibold">Safe to Spend</h2>
          <p className="mt-1 text-muted">
            Budget left plus any cash no Source holds. Every dollar in your accounts should sit in a Source, so the gap
            between the two should be 0.
          </p>
        </div>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
          <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Accounts counted as cash</dt>
          <dd />
          {data.accounts.map((a) => (
            <div key={a.id} className="contents">
              <dt className="truncate">{a.name}</dt>
              <dd className="text-right font-mono">{formatMoney(a.balance, decimalPlaces, { symbol: false })}</dd>
            </div>
          ))}
          <dt className="border-t border-border pt-1.5 font-medium">Cash</dt>
          <dd className="border-t border-border pt-1.5 text-right font-mono font-medium">{money(cash)}</dd>
          <dt>Every Source</dt>
          <dd className="text-right font-mono">{formatMoney(-data.sourcesTotal, decimalPlaces)}</dd>
          <dt className="border-t border-border pt-1.5 font-medium">Unassigned</dt>
          <dd className="border-t border-border pt-1.5 text-right font-mono font-medium">{money(data.unassigned)}</dd>
          <dt className="pt-3">Budget left</dt>
          <dd className="pt-3 text-right font-mono">{money(data.budgetBalance)}</dd>
          <dt>Plus unassigned, when above 0</dt>
          <dd className="text-right font-mono">{money(Math.max(data.unassigned, 0))}</dd>
          <dt className="border-t border-border pt-1.5 font-medium">Safe to Spend</dt>
          <dd className="border-t border-border pt-1.5 text-right font-mono font-medium">{money(data.amount)}</dd>
        </dl>
        <p className="text-xs text-muted">
          An account that isn&apos;t spendable cash (an investment or a loan) can be left out on the{" "}
          <Link href="/accounts" onClick={close} className="text-accent underline">
            Accounts page
          </Link>
          .
        </p>
      </div>,
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openBreakdown}
        className="border border-border bg-surface p-5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
      >
        <span className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Safe to Spend
        </span>
        <span className="mt-1 block text-[28px] font-semibold leading-tight">
          <Money amount={data.amount} decimalPlaces={decimalPlaces} />
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-muted tabular-nums">
          {data.unassigned !== 0 && (
            <span className={cn("flex items-center gap-1.5", data.unassigned < 0 && "text-foreground-secondary")}>
              <span aria-hidden className={cn("size-1.5 rounded-full", data.unassigned < 0 ? "bg-warning" : "bg-muted")} />
              {gapLabel}
            </span>
          )}
          <span>
            {data.lastSyncedAt ? (
              <>
                Synced <LocalTimestamp iso={data.lastSyncedAt} relative />
              </>
            ) : (
              "Never synced"
            )}
          </span>
        </span>
      </button>
      {modal}
    </>
  );
}
