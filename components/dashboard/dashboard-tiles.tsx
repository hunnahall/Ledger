"use client";

import type { ReactNode } from "react";
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
        <StatTile label="Income" onClick={() => openTile("Income", { type: "income" })}>
          <Money amount={income} decimalPlaces={decimalPlaces} className="text-positive" />
        </StatTile>
        <StatTile label="Expenses" onClick={() => openTile("Expenses", { type: "budgeted_outflow" })}>
          <Money amount={expenses} decimalPlaces={decimalPlaces} className="text-negative" />
        </StatTile>
        <StatTile label="Budget Net" onClick={() => openTile("Budget Net", { type: "budget_net" })}>
          <Money
            amount={budgetNet}
            decimalPlaces={decimalPlaces}
            className={budgetNet < 0 ? "text-negative" : "text-positive"}
          />
        </StatTile>

        <StatTile
          label="Other Inflows"
          onClick={() => openTile("Other Inflows", { type: "other_inflow" })}
        >
          <Money amount={otherInflow} decimalPlaces={decimalPlaces} className="text-positive" />
        </StatTile>
        <StatTile
          label="Other Outflows"
          onClick={() => openTile("Other Outflows", { type: "other_outflow" })}
        >
          <Money amount={otherOutflow} decimalPlaces={decimalPlaces} className="text-negative" />
        </StatTile>
        <StatTile label="Total Net" onClick={() => openTile("Total Net", { type: "total_net" })}>
          <Money
            amount={totalNet}
            decimalPlaces={decimalPlaces}
            className={totalNet < 0 ? "text-negative" : "text-positive"}
          />
        </StatTile>

        <StatTile label="Float" onClick={() => openTile("Float", { type: "float" })}>
          <Money
            amount={floatBalance}
            decimalPlaces={decimalPlaces}
            className={floatBalance < 0 ? "text-negative" : ""}
          />
        </StatTile>
        <StatTile label="Budget Fill">{budgetFillPct === null ? "—" : `${budgetFillPct}%`}</StatTile>
        <StatTile
          label="Budget Rate"
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
  children,
  onClick,
}: {
  label: string;
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

  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
    >
      {content}
    </button>
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
