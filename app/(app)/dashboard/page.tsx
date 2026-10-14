import Link from "next/link";
import { getDashboardData, getMonthlyTrend } from "@/lib/queries/dashboard";
import { getBudgetRateData } from "@/lib/queries/budgets";
import { getSettings } from "@/lib/queries/settings";
import { currentMonthISO, previousMonthISO, monthLabel } from "@/lib/dates";
import { MonthSegments } from "@/components/dashboard/month-segments";
import { PaceCard } from "@/components/dashboard/pace-card";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { DailySpendingCard } from "@/components/dashboard/daily-spending-card";
import { SourceAllocationCard } from "@/components/dashboard/source-allocation-card";
import { CategorySpendingCard } from "@/components/dashboard/category-spending-card";
import { BudgetFundingCard, FloatCard } from "@/components/dashboard/funding-and-float";
import { LastMonthsCard } from "@/components/dashboard/last-months-card";

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

  const [data, rateData, trendTotals] = await Promise.all([
    getDashboardData(monthISO),
    getBudgetRateData(monthISO, settings.timezone),
    getMonthlyTrend(months),
  ]);
  const totalAllocation = rateData?.totalAllocation ?? data.totalAllocation;
  const trend = trendTotals.map((m) => ({ ...m, totalAllocation }));
  const decimalPlaces = settings.decimal_places;

  const daysInMonth = rateData?.daysInMonth ?? 30;
  const currentDay = rateData?.currentDay ?? 0;
  const actualByDay = rateData?.actualByDay ?? [];
  const common = { monthISO, decimalPlaces };

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {monthLabel(monthISO)}
            {monthISO === months[0] && ` · Day ${currentDay} of ${daysInMonth}`}
            {!data.hasBudget && " · No current budget set"}
          </p>
        </div>
        <MonthSegments months={months} selected={monthISO} currentMonthISO={months[0]} />
      </div>

      <div className="flex flex-wrap gap-4">
        <PaceCard
          budgetNet={data.budgetNet}
          totalAllocation={totalAllocation}
          budgetedOutflow={data.budgetedOutflow}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
          actualByDay={actualByDay}
          {...common}
        />
        <CashFlowCard
          income={data.income}
          otherInflow={data.otherInflow}
          budgetedOutflow={data.budgetedOutflow}
          otherOutflow={data.otherOutflow}
          cashFlow={data.cashFlow}
          {...common}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <DailySpendingCard
          actualByDay={actualByDay}
          totalAllocation={totalAllocation}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
          {...common}
        />
        <SourceAllocationCard sources={data.sourceOutflows} {...common} />
      </div>

      <div className="flex flex-wrap gap-4">
        <CategorySpendingCard
          categories={data.categorySpending}
          monthProgress={daysInMonth > 0 ? currentDay / daysInMonth : 0}
          emptyState={
            <p className="text-sm text-muted">
              No categories in your current budget yet.{" "}
              <Link href="/budget" className="underline">
                Set one up
              </Link>
              .
            </p>
          }
          {...common}
        />
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <BudgetFundingCard
            income={data.income}
            totalAllocation={settings.month_ahead ? data.nextMonthAllocation : totalAllocation}
            fundsNextMonth={settings.month_ahead}
            {...common}
          />
          <FloatCard balance={data.floatBalance} {...common} />
          <LastMonthsCard months={trend} currentMonthISO={months[0]} decimalPlaces={decimalPlaces} />
        </div>
      </div>
    </div>
  );
}
