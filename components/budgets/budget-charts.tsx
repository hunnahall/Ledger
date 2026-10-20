"use client";

import { useRouter } from "next/navigation";
import { PieChart } from "@/components/charts/pie-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { formatMoney } from "@/lib/format";

const SINKING_ID = "block:sinking-expenses";
const TRANSFERS_ID = "block:source-transfers";

// The two Budget page graphs. The pie splits the whole Allocation (every
// Category, plus Sinking Expenses and Source Transfers as one slice each);
// the bars show this month's spending in each Category against its monthly
// amount. A Category slice or bar opens that Category's transactions for the
// month; the two allocation-only slices scroll to their block instead, since
// they're commitments with no transactions of their own.
export function BudgetCharts({
  categories,
  sinkingExpensesTotal,
  sourceTransfersTotal,
  monthISO,
  decimalPlaces,
}: {
  /** monthlyAmount is the category's own amount (the pie's slices); budget is
   * what its bar measures against (Transfers gets its override). */
  categories: { id: string; name: string; monthlyAmount: number; budget: number; spent: number }[];
  sinkingExpensesTotal: number;
  sourceTransfersTotal: number;
  monthISO: string;
  decimalPlaces: number;
}) {
  const router = useRouter();

  const openCategory = (id: string) =>
    router.push(`/transactions?category_id=${id}&date_from=${monthISO}&date_to=${endOfMonth(monthISO)}`);

  const pieItems = [
    ...categories.map((c) => ({ id: c.id, name: c.name, amount: c.monthlyAmount })),
    { id: SINKING_ID, name: "Sinking expenses", amount: sinkingExpensesTotal },
    { id: TRANSFERS_ID, name: "Source transfers", amount: sourceTransfersTotal },
  ];
  const total = pieItems.reduce((sum, i) => sum + i.amount, 0);

  function onPieSelect(id: string) {
    if (id === SINKING_ID || id === TRANSFERS_ID) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      openCategory(id);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2>Allocation</h2>
          <span className="font-mono text-xs text-muted">{formatMoney(total, decimalPlaces)} per month</span>
        </div>
        <PieChart
          items={pieItems}
          decimalPlaces={decimalPlaces}
          onSelect={onPieSelect}
          ariaLabel={`Budget allocation of ${formatMoney(total, decimalPlaces)} per month by category, sinking expenses and source transfers.`}
        />
      </section>

      <section className="border border-border bg-surface p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2>Spending by Category</h2>
          <span className="font-mono text-xs text-muted">Dashed line is the monthly amount</span>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted">No categories yet.</p>
        ) : (
          <HBarChart
            ariaLabel="Spending this month by category against each category's monthly amount"
            rows={categories.map((c) => ({
              key: c.id,
              label: c.name,
              value: c.spent,
              target: c.budget,
              valueLabel: `${formatMoney(c.spent, decimalPlaces)} / ${formatMoney(c.budget, decimalPlaces)}`,
            }))}
            onSelect={openCategory}
          />
        )}
      </section>
    </div>
  );
}

function endOfMonth(monthISO: string): string {
  const d = new Date(`${monthISO}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}
