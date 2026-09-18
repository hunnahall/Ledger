import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getBudgetRateData } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";
import { currentMonthISO, previousMonthISO, monthLabel } from "@/lib/dates";
import { DashboardStatTiles, SpendingByCategoryCard } from "@/components/dashboard/dashboard-tiles";
import { SpendingBySourceCard } from "@/components/dashboard/spending-by-source-card";
import { MonthPicker } from "@/components/dashboard/month-picker";

// Current month plus the 3 full calendar months before it — the same
// window purge_expired_data() keeps (see
// supabase/migrations/20260901010000_hardcode_three_month_retention.sql),
// so every month offered here still has data.
function selectableMonths(timeZone: string): string[] {
  const months = [currentMonthISO(timeZone)];
  for (let i = 0; i < 3; i++) months.push(previousMonthISO(months[months.length - 1]));
  return months;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  // Awaited before the rest: which month "this month" is depends on the
  // user's timezone, and every query below is scoped to that month.
  const settings = await getSettings();
  const months = selectableMonths(settings.timezone);
  const monthISO = month && months.includes(month) ? month : currentMonthISO(settings.timezone);

  const [data, rateData] = await Promise.all([
    getDashboardData(monthISO),
    getBudgetRateData(monthISO, settings.timezone),
  ]);
  const decimalPlaces = settings.decimal_places;

  const budgetFillPct =
    rateData && rateData.totalAllocation > 0
      ? Math.round((rateData.income / rateData.totalAllocation) * 100)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {data.hasBudget ? "Budget" : "No current budget set"} &middot;{" "}
            {monthLabel(monthISO)}
          </p>
        </div>
        <MonthPicker months={months} selected={monthISO} currentMonthISO={months[0]} />
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
        monthISO={monthISO}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByCategoryCard
          categorySpending={data.categorySpending}
          decimalPlaces={decimalPlaces}
          monthISO={monthISO}
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

        <SpendingBySourceCard
          spending={data.spendingBySource}
          decimalPlaces={decimalPlaces}
          monthISO={monthISO}
        />
      </div>
    </div>
  );
}
