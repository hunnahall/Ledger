"use client";

import type { ReactNode } from "react";
import { Money } from "@/components/ui/money";
import { useTilePopup } from "@/components/dashboard/use-tile-popup";
import { categoryStatus, type CategoryStatus } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

const BAR: Record<CategoryStatus, string> = {
  below: "bg-accent",
  ahead: "bg-warning",
  over: "bg-negative",
  full: "bg-chart-neutral",
};

// Each category's spend against its budget, with a tick at how far through
// the month we are — a bar past the tick is spending ahead of pace.
export function CategorySpendingCard({
  categories,
  monthProgress,
  monthISO,
  decimalPlaces,
  emptyState,
}: {
  categories: { id: string; name: string; monthly_amount: number; spent: number }[];
  /** Share of the month elapsed, 0-1 (1 for a past month). */
  monthProgress: number;
  monthISO: string;
  decimalPlaces: number;
  emptyState: ReactNode;
}) {
  const { openTile, modal } = useTilePopup(monthISO, decimalPlaces);
  const pacePct = Math.round(monthProgress * 100);

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col border border-border bg-surface p-5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Spending by Category</h2>
        <div className="flex flex-wrap gap-3.5 text-xs text-foreground-secondary">
          <Key swatch="h-3 w-0.5 bg-foreground">Today&apos;s pace ({pacePct}%)</Key>
          <Key swatch="size-2.5 bg-accent">Below pace</Key>
          <Key swatch="size-2.5 bg-warning">Ahead of pace</Key>
          <Key swatch="size-2.5 bg-negative">Over</Key>
          <Key swatch="size-2.5 bg-chart-neutral">Fully spent</Key>
        </div>
      </div>

      {categories.length === 0 ? (
        emptyState
      ) : (
        <div className="flex flex-1 flex-col justify-between">
          {categories.map((c, i) => {
            const status = categoryStatus({ spent: c.spent, budget: c.monthly_amount, monthProgress });
            const width = c.monthly_amount > 0 ? Math.min(c.spent / c.monthly_amount, 1) : c.spent > 0 ? 1 : 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openTile(c.name, { type: "category", categoryId: c.id })}
                className={cn(
                  "grid min-h-11 grid-cols-[minmax(110px,150px)_minmax(0,1fr)_132px] items-center gap-4 py-2.5 text-left text-sm",
                  "transition-colors duration-[120ms] ease-standard hover:bg-paper-a1",
                  i < categories.length - 1 && "border-b border-border",
                )}
              >
                <span className={cn("truncate font-medium", status === "full" && "text-foreground-secondary")}>
                  {c.name}
                </span>
                <span aria-hidden="true" className="relative h-2 bg-fill-active">
                  <span className={cn("absolute inset-y-0 left-0 rounded", BAR[status])} style={{ width: `${width * 100}%` }} />
                  <span
                    className="absolute -top-1 h-4 w-0.5 bg-foreground opacity-55"
                    style={{ left: `${monthProgress * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  <span className={cn("font-semibold", status === "over" && "text-negative", status === "full" && "text-foreground-secondary")}>
                    {status === "over" ? (
                      <>
                        <Money amount={c.spent - c.monthly_amount} decimalPlaces={decimalPlaces} /> over
                      </>
                    ) : status === "full" ? (
                      "Fully spent"
                    ) : (
                      <>
                        <Money amount={c.monthly_amount - c.spent} decimalPlaces={decimalPlaces} /> left
                      </>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    <Money amount={c.spent} decimalPlaces={decimalPlaces} /> /{" "}
                    <Money amount={c.monthly_amount} decimalPlaces={decimalPlaces} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {modal}
    </section>
  );
}

function Key({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={swatch} />
      {children}
    </span>
  );
}
