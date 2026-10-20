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
import { MoneyMapCard } from "@/components/dashboard/money-map-card";
import { HeatmapCard } from "@/components/dashboard/heatmap-card";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { normalizeLayout } from "@/lib/dashboard-layout";

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
    <DashboardGrid
      initialLayout={normalizeLayout(settings.dashboard_layout)}
      title={
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {selectionLabel(months, selectable)}
            {onlyCurrent && currentFigures && ` · Day ${currentFigures.throughDay} of ${currentFigures.daysInMonth}`}
            {!data.hasBudget && " · No current budget set"}
          </p>
        </div>
      }
      controls={<MonthPicker months={selectable} selected={months} />}
      tiles={{
        "money-map": <MoneyMapCard map={data.moneyMap} decimalPlaces={decimalPlaces} />,
        "budget-net": (
          <PaceCard
            budgetNet={data.budgetNet}
            allocation={data.allocation}
            expense={data.expense}
            months={data.months}
            decimalPlaces={decimalPlaces}
          />
        ),
        "cash-flow": (
          <CashFlowCard
            income={data.income}
            otherInflows={data.otherInflows}
            expense={data.expense}
            otherOutflows={data.otherOutflows}
            cashFlow={data.cashFlow}
            months={months}
            decimalPlaces={decimalPlaces}
          />
        ),
        "daily-spending": <DailySpendingCard months={data.months} decimalPlaces={decimalPlaces} />,
        "source-allocation": (
          <SourceAllocationCard
            sources={data.sourceOutflows}
            tones={data.sourceTones}
            months={months}
            decimalPlaces={decimalPlaces}
          />
        ),
        heatmap: (
          <HeatmapCard
            key={months.join()}
            days={data.dailySpending}
            months={months}
            today={today}
            decimalPlaces={decimalPlaces}
          />
        ),
        "category-spending": (
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
        ),
        "budget-funding": (
          <BudgetFundingCard
            income={data.income}
            allocation={data.fundingAllocation}
            fundsNextMonth={settings.budget_type === "advanced"}
            months={months}
            decimalPlaces={decimalPlaces}
          />
        ),
        float: <FloatCard balance={data.floatBalance} months={months} decimalPlaces={decimalPlaces} />,
        "by-month": <LastMonthsCard months={data.months} currentMonthISO={current} decimalPlaces={decimalPlaces} />,
      }}
    />
  );
}
