"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { computeProgress } from "@/lib/progress";
import { useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BudgetRateChart } from "@/components/budgets/budget-rate-chart";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";
import type { DashboardTileKind } from "@/lib/actions/dashboard-transactions";

// The Dashboard's 9 small stat tiles, all built on the same StatTile shell
// so they share Income's exact size — a label line plus one content line —
// and one shared useModal() instance so the four transaction-backed ones
// (Income, Expenses, Other Inflows, Other Outflows) can each pop open a
// transaction list without each tile owning its own portal.
export function DashboardStatTiles({
  income,
  otherInflow,
  expenses,
  otherOutflow,
  budgetNet,
  totalNet,
  floatBalance,
  budgetFillPct,
  totalAllocation,
  daysInMonth,
  currentDay,
  actualByDay,
  decimalPlaces,
  monthISO,
}: {
  income: number;
  otherInflow: number;
  expenses: number;
  otherOutflow: number;
  budgetNet: number;
  totalNet: number;
  floatBalance: number;
  budgetFillPct: number | null;
  totalAllocation: number;
  daysInMonth: number;
  currentDay: number;
  actualByDay: number[];
  decimalPlaces: number;
  monthISO: string;
}) {
  const { open, modal } = useModal();

  function openTile(title: string, kind: DashboardTileKind) {
    open(<TransactionsPopupList title={title} kind={kind} monthISO={monthISO} decimalPlaces={decimalPlaces} />);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Income"
          tooltip="Standard income."
          onClick={() => openTile("Income", { type: "income" })}
        >
          <Money amount={income} decimalPlaces={decimalPlaces} className="text-positive" />
        </StatTile>
        <StatTile
          label="Expenses"
          tooltip="Budget-sourced spending."
          onClick={() => openTile("Expenses", { type: "budgeted_outflow" })}
        >
          <Money amount={expenses} decimalPlaces={decimalPlaces} className="text-negative" />
        </StatTile>
        <StatTile
          label="Budget Net"
          tooltip="Budget Allocation - Expenses + Categorized Income."
          onClick={() => openTile("Budget Net", { type: "budget_net" })}
        >
          <Money
            amount={budgetNet}
            decimalPlaces={decimalPlaces}
            className={budgetNet < 0 ? "text-negative" : "text-positive"}
          />
        </StatTile>

        <StatTile
          label="Other Inflows"
          tooltip="Nonbudget income."
          onClick={() => openTile("Other Inflows", { type: "other_inflow" })}
        >
          <Money amount={otherInflow} decimalPlaces={decimalPlaces} className="text-positive" />
        </StatTile>
        <StatTile
          label="Other Outflows"
          tooltip="Nonbudget spending."
          onClick={() => openTile("Other Outflows", { type: "other_outflow" })}
        >
          <Money amount={otherOutflow} decimalPlaces={decimalPlaces} className="text-negative" />
        </StatTile>
        <StatTile
          label="Net Cash Flow"
          tooltip="Any income - any expenses."
          onClick={() => openTile("Net Cash Flow", { type: "total_net" })}
        >
          <Money
            amount={totalNet}
            decimalPlaces={decimalPlaces}
            className={totalNet < 0 ? "text-negative" : "text-positive"}
          />
        </StatTile>

        <StatTile label="Float" tooltip="Total money owed." onClick={() => openTile("Float", { type: "float" })}>
          <Money
            amount={floatBalance}
            decimalPlaces={decimalPlaces}
            className={floatBalance < 0 ? "text-negative" : ""}
          />
        </StatTile>
        <StatTile label="Budget Fill" tooltip="Income / Budget Allocation.">
          {budgetFillPct === null ? "—" : `${budgetFillPct}%`}
        </StatTile>
        <StatTile
          label="Budget Rate"
          tooltip="Actual spending vs. even-paced spending."
          onClick={() => openTile("Budget Rate", { type: "budgeted_outflow" })}
        >
          <BudgetRateChart
            totalAllocation={totalAllocation}
            daysInMonth={daysInMonth}
            currentDay={currentDay}
            actualByDay={actualByDay}
          />
        </StatTile>
      </div>
      {modal}
    </>
  );
}

function StatTile({
  label,
  tooltip,
  children,
  onClick,
}: {
  label: string;
  tooltip: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    // Only the tiles that open a popup react to the pointer; a plain stat
    // tile is content, not a control.
    <Card interactive={Boolean(onClick)} className="p-5">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 h-7 text-xl font-semibold">{children}</div>
    </Card>
  );

  const inner = !onClick ? (
    content
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
    >
      {content}
    </button>
  );

  // Tracks the pointer so the tooltip appears right where the cursor is
  // rather than at a fixed spot on the tile. Falls back to centered-above
  // (no cursor coordinates yet) for keyboard focus, which never fires
  // onMouseMove.
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const tooltipStyle: CSSProperties = cursor
    ? { left: cursor.x, top: cursor.y, transform: "translate(-50%, calc(-100% - 12px))" }
    : { left: "50%", top: 0, transform: "translate(-50%, calc(-100% - 8px))" };

  return (
    <div
      className="group relative"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {inner}
      {/* Delay-in / instant-out: the base 100ms transition has no delay (fast
          vanish on mouse-out); the hover/focus state overrides duration+delay
          to fade in slowly after ~1s. Leaving removes the hover rule, so the
          no-delay base transition takes over immediately. */}
      <div
        role="tooltip"
        style={tooltipStyle}
        className="pointer-events-none absolute z-10 w-max max-w-[15rem] rounded-lg border border-card-border bg-surface px-3 py-2 text-xs text-muted opacity-0 shadow-popover transition-opacity duration-100 group-hover:opacity-100 group-hover:delay-[1000ms] group-hover:duration-150 group-focus-visible:opacity-100 group-focus-visible:delay-[1000ms] group-focus-visible:duration-150"
      >
        {tooltip}
      </div>
    </div>
  );
}

export function SpendingByCategoryCard({
  categorySpending,
  decimalPlaces,
  monthISO,
  emptyState,
}: {
  categorySpending: { id: string; name: string; monthly_amount: number; spent: number }[];
  decimalPlaces: number;
  monthISO: string;
  emptyState: React.ReactNode;
}) {
  const { open, modal } = useModal();

  return (
    <Card className="p-5">
      <p className="mb-3 font-medium">Spending By Category</p>
      {categorySpending.length === 0 && emptyState}
      <div className="flex flex-col gap-3">
        {categorySpending.map((c) => {
          const { over } = computeProgress({ total: c.monthly_amount, spent: c.spent });
          return (
            <button
              key={c.id}
              type="button"
              className="text-left"
              onClick={() =>
                open(
                  <TransactionsPopupList
                    title={c.name}
                    kind={{ type: "category", categoryId: c.id }}
                    monthISO={monthISO}
                    decimalPlaces={decimalPlaces}
                  />,
                )
              }
            >
              <div className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className={over ? "text-negative" : "text-muted"}>
                  <Money amount={c.spent} decimalPlaces={decimalPlaces} /> /{" "}
                  <Money amount={c.monthly_amount} decimalPlaces={decimalPlaces} />
                </span>
              </div>
              <div className="mt-1">
                <ProgressBar total={c.monthly_amount} spent={c.spent} />
              </div>
            </button>
          );
        })}
      </div>
      {modal}
    </Card>
  );
}
