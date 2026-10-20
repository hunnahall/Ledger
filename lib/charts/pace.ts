// The Dashboard pace chart's lines: each selected month's cumulative Budget
// spending by day of the month, laid over each other. Every line uses the
// same definition (cumulativeExpenseByDay, the twin of v_outflows' expense),
// so a month's line ends where its Expense figure does.

/** A line's running total on `day`, holding its last value past its end (a 30-day month on the 31st). */
export function valueOnDay(byDay: number[], day: number): number {
  if (day <= 0 || byDay.length === 0) return 0;
  return byDay[Math.min(day, byDay.length) - 1];
}

/** The largest value the chart has to fit: the pace target and every line through `daysInMonth`. */
export function paceChartPeak({
  allocation,
  lines,
  daysInMonth,
}: {
  allocation: number;
  lines: number[][];
  daysInMonth: number;
}): number {
  return Math.max(allocation, ...lines.map((l) => valueOnDay(l, daysInMonth)), 1);
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
