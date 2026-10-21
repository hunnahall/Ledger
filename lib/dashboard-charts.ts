// Pure derivations behind the Dashboard's charts. Every figure a chart shows
// comes from computeDashboardTotals (lib/dashboard-metrics.ts) or from here,
// so components only draw — they never add or compare raw amounts themselves.

import { ringArcs, type RingArc } from "@/lib/charts/donut";
import { MAX_TONES, type ChartTone } from "@/lib/charts/source-tones";

/** Per-day spend from the pace chart's cumulative series (a month's expenseByDay, see getDashboardData). */
export function dailyFromCumulative(actualByDay: number[]): number[] {
  return actualByDay.map((total, i) => total - (i === 0 ? 0 : actualByDay[i - 1]));
}

/** A day "well above" pace spent more than this multiple of the even daily pace. */
const WELL_ABOVE_PACE_MULTIPLE = 1.5;

type DailyPaceStatus = "below" | "slightly_above" | "well_above";

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

export type PieTone = ChartTone;

export type PieSlice = {
  key: string;
  label: string;
  amount: number;
  share: number;
  /** 1-12 index into the chart-1..12 series, or null for the grouped remainder (Other, in --fg-3). */
  tone: PieTone | null;
  /** This slice's stretch of the ring. */
  arc: RingArc;
};

type PieLegendRow = {
  id: string;
  name: string;
  amount: number;
  share: number;
  tone: PieTone | null;
};

/**
 * Splits amounts into ring slices. Without `tones`, the largest `maxSlices`
 * items get their own slice and tone in rank order. With `tones` (a stable
 * per-Source color, see lib/charts/source-tones.ts), each item keeps its own
 * tone and items mapped to null are grouped. Either way the grouped
 * remainder is one neutral "Other" slice, and every item still gets a legend
 * row (zero ones last).
 */
export function buildSourcePie(
  sources: { id: string; name: string; spent: number }[],
  {
    maxSlices = MAX_TONES,
    tones,
  }: { maxSlices?: number; tones?: Map<string, PieTone | null> } = {},
): { total: number; slices: PieSlice[]; legend: PieLegendRow[] } {
  const spending = sources.filter((s) => s.spent > 0).sort((a, b) => b.spent - a.spent);
  const idle = sources.filter((s) => s.spent <= 0).sort((a, b) => a.name.localeCompare(b.name));
  const total = spending.reduce((sum, s) => sum + s.spent, 0);
  const share = (amount: number) => (total > 0 ? amount / total : 0);

  const toneOf = (id: string, rank: number): PieTone | null =>
    tones ? (tones.get(id) ?? null) : rank < maxSlices ? ((rank + 1) as PieTone) : null;

  const own = spending.filter((s, i) => toneOf(s.id, i) !== null);
  const rest = spending.filter((s, i) => toneOf(s.id, i) === null);

  const raw: Omit<PieSlice, "arc">[] = own.map((s) => ({
    key: s.id,
    label: s.name,
    amount: s.spent,
    share: share(s.spent),
    tone: toneOf(s.id, spending.indexOf(s)),
  }));
  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, s) => sum + s.spent, 0);
    raw.push({ key: "other", label: "Other", amount: restTotal, share: share(restTotal), tone: null });
  }

  const arcs = ringArcs(raw.map((s) => s.share));
  const slices = raw.map((s, i) => ({ ...s, arc: arcs[i] }));

  const legend: PieLegendRow[] = [
    ...spending.map((s, i) => ({
      id: s.id,
      name: s.name,
      amount: s.spent,
      share: share(s.spent),
      tone: toneOf(s.id, i),
    })),
    ...idle.map((s) => ({ id: s.id, name: s.name, amount: 0, share: 0, tone: tones?.get(s.id) ?? null })),
  ];

  return { total, slices, legend };
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
  expense: number;
  outflows: number;
  allocation: number;
};

/** The two series one By Month mode compares, per month. */
export function trendPair(m: TrendMonth, mode: TrendMode): [number, number] {
  switch (mode) {
    case "income_expenses":
      return [m.income, m.expense];
    case "inflows_outflows":
      return [m.inflows, m.outflows];
    case "budget_spending":
      return [m.allocation, m.expense];
  }
}
