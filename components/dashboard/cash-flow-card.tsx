"use client";

import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import type { DashboardTileKind } from "@/lib/actions/dashboard-transactions";
import { cn } from "@/lib/cn";

const BAR_HEIGHT = 260;
// A segment with any money in it stays visible even when it's tiny next to
// the others (other inflows are often a sliver beside income).
const MIN_SEGMENT = 4;

// One bar: inflows stacked above the $0 line (income, then other inflows),
// outflows below it (expenses, then other outflows), with a marker at the
// net. Every figure is computeDashboardTotals' own — cashFlow is exactly
// inflows - outflows, so the marker always sits where the segments net out.
export function CashFlowCard({
  income,
  otherInflows,
  expense,
  otherOutflows,
  cashFlow,
  monthISO,
  decimalPlaces,
}: {
  income: number;
  otherInflows: number;
  expense: number;
  otherOutflows: number;
  cashFlow: number;
  monthISO: string;
  decimalPlaces: number;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);

  const total = income + otherInflows + expense + otherOutflows;
  const px = (amount: number) =>
    amount <= 0 || total <= 0 ? 0 : Math.max(MIN_SEGMENT, (amount / total) * BAR_HEIGHT);
  const segments = {
    otherInflows: px(otherInflows),
    income: px(income),
    expense: px(expense),
    otherOutflows: px(otherOutflows),
  };
  const zeroY = segments.otherInflows + segments.income;
  const scale = total > 0 ? BAR_HEIGHT / total : 0;
  const netY = Math.min(BAR_HEIGHT, Math.max(0, zeroY - cashFlow * scale));
  const barHeight = zeroY + segments.expense + segments.otherOutflows;

  const rows: { label: string; amount: number; sign: "+" | "−"; tone: string; kind: DashboardTileKind }[] = [
    { label: "Other inflows", amount: otherInflows, sign: "+", tone: "bg-chart-1/50", kind: { type: "other_inflows" } },
    { label: "Income", amount: income, sign: "+", tone: "bg-chart-1", kind: { type: "income" } },
    { label: "Expenses", amount: expense, sign: "−", tone: "bg-foreground/75", kind: { type: "expense" } },
    { label: "Other outflows", amount: otherOutflows, sign: "−", tone: "bg-foreground/35", kind: { type: "other_outflows" } },
  ];

  return (
    <section className="flex min-w-0 flex-[1_1_380px] flex-col border border-border bg-surface p-5">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Cash Flow</h2>
        <button
          type="button"
          onClick={() => openTile("Net Cash Flow", { type: "cash_flow" })}
          className="px-1.5 text-sm text-foreground-secondary transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
        >
          Net{" "}
          <span className={cn("text-xl font-semibold", cashFlow < 0 && "text-danger")}>
            {cashFlow > 0 && "+"}
            <Money amount={cashFlow} decimalPlaces={decimalPlaces} />
          </span>
        </button>
      </div>

      <div className="flex flex-1 items-center gap-7">
        <div
          role="img"
          aria-label={`Income and other inflows above zero, expenses and other outflows below; net cash flow ${cashFlow < 0 ? "negative" : "positive"}.`}
          className="relative ml-3 w-16 flex-none"
          style={{ height: Math.max(barHeight, 2) }}
        >
          <Segment top={0} height={segments.otherInflows} className="bg-chart-1/50" />
          <Segment top={segments.otherInflows} height={segments.income} className="bg-chart-1" />
          <Segment top={zeroY} height={segments.expense} className="bg-foreground/75" />
          <Segment top={zeroY + segments.expense} height={segments.otherOutflows} className="bg-foreground/35" />
          <div aria-hidden="true" className="absolute -inset-x-3 h-0.5 bg-foreground" style={{ top: zeroY - 1 }} />
          {total > 0 && (
            <div aria-hidden="true" className="absolute -inset-x-2 border-t-2 border-dashed border-foreground" style={{ top: netY - 1 }} />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm tabular-nums">
          {rows.slice(0, 2).map((r) => (
            <Row key={r.label} {...r} decimalPlaces={decimalPlaces} onClick={() => openTile(r.label, r.kind)} />
          ))}
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span aria-hidden="true" className="h-0.5 w-2.5 bg-foreground" />
            $0
          </div>
          {rows.slice(2).map((r) => (
            <Row key={r.label} {...r} decimalPlaces={decimalPlaces} onClick={() => openTile(r.label, r.kind)} />
          ))}
          <div className="flex items-center gap-2 border-t border-border pt-2.5 text-foreground-secondary">
            <span aria-hidden="true" className="w-2.5 flex-none border-t-2 border-dashed border-foreground-secondary" />
            <span className="flex-1 whitespace-nowrap">Net cash flow</span>
            <span className="font-semibold text-foreground">
              {cashFlow > 0 && "+"}
              <Money amount={cashFlow} decimalPlaces={decimalPlaces} />
            </span>
          </div>
        </div>
      </div>
      {modal}
    </section>
  );
}

function Segment({ top, height, className }: { top: number; height: number; className: string }) {
  if (height <= 0) return null;
  return <div aria-hidden="true" className={cn("absolute inset-x-0", className)} style={{ top, height }} />;
}

function Row({
  label,
  amount,
  sign,
  tone,
  decimalPlaces,
  onClick,
}: {
  label: string;
  amount: number;
  sign: "+" | "−";
  tone: string;
  decimalPlaces: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-1.5 flex min-h-8 items-center gap-2 px-1.5 text-left transition-colors duration-[120ms] ease-standard hover:bg-fill-hover"
    >
      <span aria-hidden="true" className={cn("size-2.5 flex-none", tone)} />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      <span className="font-semibold">
        {amount > 0 ? sign : ""}
        <Money amount={amount} decimalPlaces={decimalPlaces} />
      </span>
    </button>
  );
}
