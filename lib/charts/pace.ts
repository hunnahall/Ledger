// The Dashboard pace chart's lines: this month's cumulative Budget spending
// and up to three earlier months drawn behind it for comparison. Every line
// uses the same definition (cumulativeExpenseByDay, the twin of v_outflows'
// expense), so a past month's line ends where its Expense figure does.

import { cumulativeExpenseByDay, type Leg } from "@/lib/transactions/legs";
import { daysInMonthISO, nextMonthISO, previousMonthISO } from "@/lib/dates";

/** How many earlier months the chart can show behind the selected one. */
export const PACE_HISTORY_MONTHS = 3;

export type PaceLine = { month: string; byDay: number[] };

/** The months before `monthISO`, newest first. */
export function earlierMonths(monthISO: string, count = PACE_HISTORY_MONTHS): string[] {
  const out: string[] = [];
  for (let m = monthISO; out.length < count; ) {
    m = previousMonthISO(m);
    out.push(m);
  }
  return out;
}

/**
 * Cumulative expense per day for each of `months`, newest first. A month
 * with no transactions at all (older than what Ledger keeps) is skipped.
 */
export function earlierMonthLines(legs: Leg[], months: string[]): PaceLine[] {
  return months.flatMap((month) => {
    const end = nextMonthISO(month);
    const inMonth = legs.filter((l) => l.postedDate >= month && l.postedDate < end);
    if (inMonth.length === 0) return [];
    return [{ month, byDay: cumulativeExpenseByDay(inMonth, daysInMonthISO(month)) }];
  });
}

/** A line's running total on `day`, holding its last value past its end (a 30-day month on the 31st). */
export function valueOnDay(byDay: number[], day: number): number {
  if (day <= 0 || byDay.length === 0) return 0;
  return byDay[Math.min(day, byDay.length) - 1];
}

/** The largest value the chart has to fit, through `daysInMonth` of the selected month. */
export function paceChartPeak({
  allocation,
  current,
  earlier,
  daysInMonth,
}: {
  allocation: number;
  current: number[];
  earlier: PaceLine[];
  daysInMonth: number;
}): number {
  const spentSoFar = current[current.length - 1] ?? 0;
  const earlierPeak = Math.max(0, ...earlier.map((l) => valueOnDay(l.byDay, daysInMonth)));
  return Math.max(allocation, spentSoFar, earlierPeak, 1);
}

/** SVG polyline points for a cumulative line, starting from 0 at day 0 and cut off at `daysInMonth`. */
export function cumulativeLinePoints(
  byDay: number[],
  { daysInMonth, maxY, width, height }: { daysInMonth: number; maxY: number; width: number; height: number },
): string {
  const x = (day: number) => (day / daysInMonth) * width;
  const y = (amount: number) => height - (amount / maxY) * height;
  const points = [[0, height], ...byDay.slice(0, daysInMonth).map((v, i) => [x(i + 1), y(v)])];
  return points.map(([px, py]) => `${round(px)},${round(py)}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
