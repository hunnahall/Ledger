"use client";

import { useRouter } from "next/navigation";
import { PieChart } from "@/components/charts/pie-chart";
import { formatMoney } from "@/lib/format";
import { ChartTitle } from "@/components/charts/chart-title";

const SINKING_ID = "block:sinking-expenses";
const TRANSFERS_ID = "block:source-transfers";

// The Budget page's Allocation ring. It splits the whole Allocation (every
// Category, plus Sinking Expenses and Source Transfers as one slice each).
// A Category slice opens that Category's transactions for the month; the two
// allocation-only slices scroll to their block instead, since they're
// commitments with no transactions of their own.
export function BudgetCharts({
  categories,
  sinkingExpensesTotal,
  sourceTransfersTotal,
  monthISO,
  decimalPlaces,
}: {
  categories: { id: string; name: string; monthlyAmount: number }[];
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
    <div className="h-full">
      <section className="h-full border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ChartTitle>Allocation</ChartTitle>
          <span className="font-mono text-xs text-muted">{formatMoney(total, decimalPlaces)} per month</span>
        </div>
        <PieChart
          items={pieItems}
          decimalPlaces={decimalPlaces}
          onSelect={onPieSelect}
          ariaLabel={`Budget allocation of ${formatMoney(total, decimalPlaces)} per month by category, sinking expenses and source transfers.`}
        />
      </section>

    </div>
  );
}

function endOfMonth(monthISO: string): string {
  const d = new Date(`${monthISO}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}
