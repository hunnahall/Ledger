import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getBudgetRateData } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { DashboardTopTiles, SpendingByCategoryCard } from "@/components/dashboard/dashboard-tiles";
import { BudgetFillRateTiles } from "@/components/dashboard/budget-fill-rate-card";

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

      <DashboardTopTiles
        income={data.income}
        otherInflow={data.otherInflow}
        budgetedOutflow={data.budgetedOutflow}
        otherOutflow={data.otherOutflow}
        decimalPlaces={decimalPlaces}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted">Budget Net</p>
          <p
            className={`mt-1 text-xl font-semibold ${data.budgetNet < 0 ? "text-negative" : "text-positive"}`}
          >
            <Money amount={data.budgetNet} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Total Net</p>
          <p
            className={`mt-1 text-xl font-semibold ${data.totalNet < 0 ? "text-negative" : "text-positive"}`}
          >
            <Money amount={data.totalNet} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Float</p>
          <p className={`mt-1 text-xl font-semibold ${data.floatBalance < 0 ? "text-negative" : ""}`}>
            <Money amount={data.floatBalance} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
      </div>

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

        {rateData && (
          <BudgetFillRateTiles
            budgetFillPct={budgetFillPct}
            totalAllocation={rateData.totalAllocation}
            daysInMonth={rateData.daysInMonth}
            currentDay={rateData.currentDay}
            actualByDay={rateData.actualByDay}
          />
        )}

        <Card className="p-5">
          <p className="mb-3 font-medium">Source Balances</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.sourceBalances.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className={(s.balance ?? 0) < 0 ? "text-negative" : ""}>
                  <Money amount={s.balance ?? 0} decimalPlaces={decimalPlaces} />
                </span>
              </div>
            ))}
            {data.sourceBalances.length === 0 && (
              <p className="text-muted">
                No sources yet.{" "}
                <Link href="/sources" className="underline">
                  Add one
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 font-medium">Funds</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.funds.map((f) => (
              <div key={f.id} className="flex justify-between">
                <span>{f.name}</span>
                <span className={f.balance < 0 ? "text-negative" : ""}>
                  <Money amount={f.balance} decimalPlaces={decimalPlaces} />
                </span>
              </div>
            ))}
            {data.funds.length === 0 && (
              <p className="text-muted">
                No funds yet.{" "}
                <Link href="/sources" className="underline">
                  Add one
                </Link>
                .
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
