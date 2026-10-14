// Pure derivations behind the Dashboard's charts. Every figure a chart shows
// comes from computeDashboardTotals (lib/dashboard-metrics.ts) or from here,
// so components only draw — they never add or compare raw amounts themselves.

/** Per-day spend from the pace chart's cumulative series (getBudgetRateData's actualByDay). */
export function dailyFromCumulative(actualByDay: number[]): number[] {
  return actualByDay.map((total, i) => total - (i === 0 ? 0 : actualByDay[i - 1]));
}

/** A day "well above" pace spent more than this multiple of the even daily pace. */
export const WELL_ABOVE_PACE_MULTIPLE = 1.5;

export type DailyPaceStatus = "below" | "slightly_above" | "well_above";

export function dailyPaceStatus(amount: number, pacePerDay: number): DailyPaceStatus {
  if (amount <= pacePerDay) return "below";
  if (amount <= pacePerDay * WELL_ABOVE_PACE_MULTIPLE) return "slightly_above";
  return "well_above";
}

export type CategoryStatus = "below" | "ahead" | "full" | "over";

/**
 * Where a category stands against the month so far. `monthProgress` is the
 * share of the month elapsed (0-1). Exactly fully spent reads as "full" (a
 * paid bill), not "ahead".
 */
export function categoryStatus({
  spent,
  budget,
  monthProgress,
}: {
  spent: number;
  budget: number;
  monthProgress: number;
}): CategoryStatus {
  if (spent > budget) return "over";
  if (budget > 0 && spent === budget) return "full";
  const share = budget > 0 ? spent / budget : 0;
  return share > monthProgress ? "ahead" : "below";
}

/**
 * Straight-line month-end projection of Budget spending. A month that has
 * fully elapsed has nothing to project, so its actual is returned.
 */
export function projectMonthEnd(spent: number, currentDay: number, daysInMonth: number): number {
  if (currentDay <= 0) return 0;
  if (currentDay >= daysInMonth) return spent;
  return (spent / currentDay) * daysInMonth;
}

export type PieSlice = {
  key: string;
  label: string;
  amount: number;
  share: number;
  /** 1-4 index into the chart-1..4 ramp, or null for the grouped remainder. */
  tone: 1 | 2 | 3 | 4 | null;
  /** SVG path for this slice in a 0..size box, or null when it has no area. */
  path: string | null;
};

export type PieLegendRow = {
  id: string;
  name: string;
  amount: number;
  share: number;
  tone: 1 | 2 | 3 | 4 | null;
};

/**
 * Splits gross spending per source into pie slices. The largest `maxSlices`
 * sources get their own slice and tone; any further sources with spending are
 * grouped into one neutral "Other" slice. Every source still gets a legend
 * row (zero-spend ones last), so all sources are listed.
 */
export function buildSourcePie(
  sources: { id: string; name: string; spent: number }[],
  { maxSlices = 4, size = 140 }: { maxSlices?: number; size?: number } = {},
): { total: number; slices: PieSlice[]; legend: PieLegendRow[] } {
  const spending = sources.filter((s) => s.spent > 0).sort((a, b) => b.spent - a.spent);
  const idle = sources.filter((s) => s.spent <= 0).sort((a, b) => a.name.localeCompare(b.name));
  const total = spending.reduce((sum, s) => sum + s.spent, 0);
  const share = (amount: number) => (total > 0 ? amount / total : 0);

  const own = spending.slice(0, maxSlices);
  const rest = spending.slice(maxSlices);
  const toneFor = (i: number) => (i + 1) as 1 | 2 | 3 | 4;

  const raw: Omit<PieSlice, "path">[] = own.map((s, i) => ({
    key: s.id,
    label: s.name,
    amount: s.spent,
    share: share(s.spent),
    tone: toneFor(i),
  }));
  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, s) => sum + s.spent, 0);
    raw.push({ key: "other", label: "Other", amount: restTotal, share: share(restTotal), tone: null });
  }

  let start = 0;
  const slices = raw.map((s) => {
    const path = s.share > 0 ? slicePath(start, start + s.share, size) : null;
    start += s.share;
    return { ...s, path };
  });

  const legend: PieLegendRow[] = [
    ...spending.map((s, i) => ({
      id: s.id,
      name: s.name,
      amount: s.spent,
      share: share(s.spent),
      tone: i < maxSlices ? toneFor(i) : null,
    })),
    ...idle.map((s) => ({ id: s.id, name: s.name, amount: 0, share: 0, tone: null })),
  ];

  return { total, slices, legend };
}

// One wedge from fraction `from` to `to` (0-1, clockwise from 12 o'clock).
// A single source taking the whole pie is drawn as two half arcs, since an
// SVG arc can't start and end on the same point.
function slicePath(from: number, to: number, size: number): string {
  const r = size / 2;
  const c = size / 2;
  const point = (f: number) => {
    const a = f * 2 * Math.PI;
    return `${round(c + r * Math.sin(a))},${round(c - r * Math.cos(a))}`;
  };
  if (to - from >= 0.9999) {
    return `M${c},${c - r} A${r},${r} 0 1 1 ${c},${c + r} A${r},${r} 0 1 1 ${c},${c - r} Z`;
  }
  const large = to - from > 0.5 ? 1 : 0;
  return `M${c},${c} L${point(from)} A${r},${r} 0 ${large} 1 ${point(to)} Z`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export type TrendMode = "income_expenses" | "inflows_outflows" | "budget_spending";

export const TREND_MODES: { value: TrendMode; label: string; a: string; b: string }[] = [
  { value: "income_expenses", label: "Income / Expenses", a: "Income", b: "Expenses" },
  { value: "inflows_outflows", label: "Inflows / Outflows", a: "Inflows", b: "Outflows" },
  { value: "budget_spending", label: "Budget / Spending", a: "Budget", b: "Spending" },
];

export type TrendMonth = {
  month: string;
  income: number;
  inflows: number;
  budgetedOutflow: number;
  outflows: number;
  totalAllocation: number;
};

/** The two series one Last 4 Months mode compares, per month. */
export function trendPair(m: TrendMonth, mode: TrendMode): [number, number] {
  switch (mode) {
    case "income_expenses":
      return [m.income, m.budgetedOutflow];
    case "inflows_outflows":
      return [m.inflows, m.outflows];
    case "budget_spending":
      return [m.totalAllocation, m.budgetedOutflow];
  }
}
