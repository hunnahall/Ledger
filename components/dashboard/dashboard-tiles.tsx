"use client";

import { computeProgress } from "@/lib/progress";
import { useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";
import type { DashboardTileKind } from "@/lib/actions/dashboard-transactions";

// Client-side home for every clickable piece of the Dashboard (the top 4
// summary tiles + the Spending-by-category rows) so they can share one
// useModal() instance instead of each tile owning its own portal. The rest
// of the Dashboard (Budget Net/Total Net/Float, balances, funds) stays
// server-rendered directly in app/(app)/dashboard/page.tsx — those are
// computed combinations or plain balances, not a well-defined transaction
// list, so they're left non-clickable for now.
export function DashboardTopTiles({
  income,
  otherInflow,
  budgetedOutflow,
  otherOutflow,
  decimalPlaces,
}: {
  income: number;
  otherInflow: number;
  budgetedOutflow: number;
  otherOutflow: number;
  decimalPlaces: number;
}) {
  const { open, modal } = useModal();

  function openTile(title: string, kind: DashboardTileKind) {
    open(<TransactionsPopupList title={title} kind={kind} decimalPlaces={decimalPlaces} />);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TileButton
          label="Income"
          amount={income}
          decimalPlaces={decimalPlaces}
          valueClassName="text-positive"
          onClick={() => openTile("Income", { type: "income" })}
        />
        <TileButton
          label="Other Inflows"
          amount={otherInflow}
          decimalPlaces={decimalPlaces}
          valueClassName="text-positive"
          onClick={() => openTile("Other Inflows", { type: "other_inflow" })}
        />
        <TileButton
          label="Budgeted Outflows"
          amount={budgetedOutflow}
          decimalPlaces={decimalPlaces}
          valueClassName="text-negative"
          onClick={() => openTile("Budgeted Outflows", { type: "budgeted_outflow" })}
        />
        <TileButton
          label="Other Outflows"
          amount={otherOutflow}
          decimalPlaces={decimalPlaces}
          valueClassName="text-negative"
          onClick={() => openTile("Other Outflows", { type: "other_outflow" })}
        />
      </div>
      {modal}
    </>
  );
}

function TileButton({
  label,
  amount,
  decimalPlaces,
  valueClassName,
  onClick,
}: {
  label: string;
  amount: number;
  decimalPlaces: number;
  valueClassName: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="p-5">
        <p className="text-xs text-muted">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${valueClassName}`}>
          <Money amount={amount} decimalPlaces={decimalPlaces} />
        </p>
      </Card>
    </button>
  );
}

export function SpendingByCategoryCard({
  categorySpending,
  decimalPlaces,
  emptyState,
}: {
  categorySpending: { id: string; name: string; monthly_amount: number; spent: number }[];
  decimalPlaces: number;
  emptyState: React.ReactNode;
}) {
  const { open, modal } = useModal();

  return (
    <Card className="p-5">
      <p className="mb-3 font-medium">Spending by category</p>
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
