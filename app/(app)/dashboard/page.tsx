import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getSettings } from "@/lib/queries/settings";
import { currentMonthISO, todayISO } from "@/lib/dates";
import { parseMonthSelection, selectableMonths, selectionLabel, selectionProgress } from "@/lib/dashboard-months";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { PaceCard } from "@/components/dashboard/pace-card";
import { CashFlowCard } from "@/components/dashboard/cash-flow-card";
import { DailySpendingCard } from "@/components/dashboard/daily-spending-card";
import { SourceAllocationCard } from "@/components/dashboard/source-allocation-card";
import { CategorySpendingCard } from "@/components/dashboard/category-spending-card";
import { BudgetFundingCard, FloatCard } from "@/components/dashboard/funding-and-float";
import { LastMonthsCard } from "@/components/dashboard/last-months-card";
import { SafeToSpendCard } from "@/components/dashboard/safe-to-spend-card";
import { MoneyMapCard } from "@/components/dashboard/money-map-card";
import { HeatmapCard } from "@/components/dashboard/heatmap-card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const params = await searchParams;
  // Awaited before the rest: which month "this month" is depends on the
  // user's timezone, and every query below is scoped to the selection.
  const settings = await getSettings();
  const current = currentMonthISO(settings.timezone);
  const today = todayISO(settings.timezone);
  // The current month plus the 3 full months before it: the same window
  // purge_expired_data() keeps, so every month offered still has data.
  const selectable = selectableMonths(current);
  const months = parseMonthSelection(params.months, selectable);

  const data = await getDashboardData(months, today, settings.budget_type);
  const decimalPlaces = settings.decimal_places;
  const onlyCurrent = months.length === 1 && months[0] === current;
  const currentFigures = data.months.find((m) => m.month === current);

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {selectionLabel(months, selectable)}
            {onlyCurrent && currentFigures && ` · Day ${currentFigures.throughDay} of ${currentFigures.daysInMonth}`}
            {!data.hasBudget && " · No current budget set"}
          </p>
        </div>
        <MonthPicker months={selectable} selected={months} />
      </div>

      <MoneyMapCard map={data.moneyMap} decimalPlaces={decimalPlaces} />

      <div className="flex flex-wrap gap-4">
        <PaceCard
          budgetNet={data.budgetNet}
          allocation={data.allocation}
          expense={data.expense}
          months={data.months}
          decimalPlaces={decimalPlaces}
        />
        <CashFlowCard
          income={data.income}
          otherInflows={data.otherInflows}
          expense={data.expense}
          otherOutflows={data.otherOutflows}
          cashFlow={data.cashFlow}
          months={months}
          decimalPlaces={decimalPlaces}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <DailySpendingCard months={data.months} decimalPlaces={decimalPlaces} />
        <SourceAllocationCard
          sources={data.sourceOutflows}
          tones={data.sourceTones}
          months={months}
          decimalPlaces={decimalPlaces}
        />
      </div>

      <HeatmapCard
        key={months.join()}
        days={data.dailySpending}
        months={months}
        today={today}
        decimalPlaces={decimalPlaces}
      />

      <div className="flex flex-wrap gap-4">
        <CategorySpendingCard
          categories={data.categorySpending}
          monthProgress={selectionProgress(months, today)}
          months={months}
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
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <BudgetFundingCard
            income={data.income}
            allocation={data.fundingAllocation}
            fundsNextMonth={settings.budget_type === "advanced"}
            months={months}
            decimalPlaces={decimalPlaces}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SafeToSpendCard data={data.safeToSpend} decimalPlaces={decimalPlaces} />
            <FloatCard balance={data.floatBalance} months={months} decimalPlaces={decimalPlaces} />
          </div>
          <LastMonthsCard months={data.months} currentMonthISO={current} decimalPlaces={decimalPlaces} />
        </div>
      </div>
    </div>
  );
}
