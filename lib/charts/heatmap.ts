// The Dashboard's spending heatmap: one square per day, weeks as columns
// starting Sunday, shaded by where the day falls among the nonzero days
// (quartiles), so one rent day doesn't wash every other day out.

export type DaySpent = { date: string; spent: number };

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatCell = { date: string; spent: number; level: HeatLevel; week: number; weekday: number };

export type Heatmap = {
  /** Columns of 7 (Sunday first); null where a day is before `from` or after `to`. */
  weeks: (HeatCell | null)[][];
  /** Every drawn day in date order, for keyboard movement. */
  cells: HeatCell[];
  /** The 25th, 50th and 75th percentile of nonzero days. */
  thresholds: [number, number, number];
};

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday. Dates are calendar days, so UTC can't shift them. */
export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Linear-interpolated percentile (0-1) of an ascending list. */
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function heatLevel(spent: number, [p25, p50, p75]: [number, number, number]): HeatLevel {
  if (spent <= 0) return 0;
  if (spent <= p25) return 1;
  if (spent <= p50) return 2;
  if (spent <= p75) return 3;
  return 4;
}

/**
 * Every day from `from` through `to` (inclusive), in week columns. Days
 * `include` turns down (a month that isn't selected) are left blank.
 */
export function buildHeatmap(
  days: DaySpent[],
  { from, to, include = () => true }: { from: string; to: string; include?: (date: string) => boolean },
): Heatmap {
  const shown = (date: string) => date >= from && date <= to && include(date);
  const spentOn = new Map(days.map((d) => [d.date, d.spent]));
  const nonzero = days
    .filter((d) => shown(d.date) && d.spent > 0)
    .map((d) => d.spent)
    .sort((a, b) => a - b);
  const thresholds: [number, number, number] = [
    quantile(nonzero, 0.25),
    quantile(nonzero, 0.5),
    quantile(nonzero, 0.75),
  ];

  const weeks: (HeatCell | null)[][] = [];
  const cells: HeatCell[] = [];
  const firstSunday = addDays(from, -weekday(from));
  for (let start = firstSunday, week = 0; start <= to; start = addDays(start, 7), week++) {
    const column: (HeatCell | null)[] = [];
    for (let wd = 0; wd < 7; wd++) {
      const date = addDays(start, wd);
      if (!shown(date)) {
        column.push(null);
        continue;
      }
      const spent = spentOn.get(date) ?? 0;
      const cell = { date, spent, level: heatLevel(spent, thresholds), week, weekday: wd };
      column.push(cell);
      cells.push(cell);
    }
    weeks.push(column);
  }
  return { weeks, cells, thresholds };
}

/** Sum of each month's days, to the cent, keyed YYYY-MM-01. */
export function monthTotals(days: DaySpent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of days) {
    const month = `${d.date.slice(0, 7)}-01`;
    out.set(month, Math.round(((out.get(month) ?? 0) + d.spent) * 100) / 100);
  }
  return out;
}
