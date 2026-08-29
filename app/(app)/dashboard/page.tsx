import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getBudgetRateData } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";
import { DashboardStatTiles, SpendingByCategoryCard } from "@/components/dashboard/dashboard-tiles";
import { BalancesCard } from "@/components/dashboard/balances-card";

export default async function DashboardPage() {
  const [data, settings, rateData] = await Promise.all([
    getDashboardData(),
    getSettings(),
    getBudgetRateData(),
  ]);
  const decimalPlaces = settings.decimal_places;

  const budgetFillPct =
    rateData && rateData.totalAllocation > 0
      ? Math.round((rateData.income / rateData.totalAllocation) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {data.hasBudget ? "Budget" : "No current budget set"} &middot;{" "}
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      <DashboardStatTiles
        income={data.income}
        otherInflow={data.otherInflow}
        expenses={data.budgetedOutflow}
        otherOutflow={data.otherOutflow}
        budgetNet={data.budgetNet}
        totalNet={data.totalNet}
        floatBalance={data.floatBalance}
        budgetFillPct={budgetFillPct}
        totalAllocation={rateData?.totalAllocation ?? 0}
        daysInMonth={rateData?.daysInMonth ?? 30}
        currentDay={rateData?.currentDay ?? 0}
        actualByDay={rateData?.actualByDay ?? []}
        decimalPlaces={decimalPlaces}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByCategoryCard
          categorySpending={data.categorySpending}
          decimalPlaces={decimalPlaces}
          emptyState={
            <p className="text-sm text-muted">
              No categories in your current budget yet.{" "}
              <Link href="/budget" className="underline">
                Set one up
              </Link>
              .
            </p>
          }
        />

        <BalancesCard balances={data.balances} decimalPlaces={decimalPlaces} />
      </div>
    </div>
  );
}
