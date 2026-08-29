// Pure inline SVG, no charting dependency — two lines over day-of-month vs.
// cumulative $ spent: a straight pace line (budget allocation spread evenly
// across the month) and the actual cumulative Budget-sourced spend so far,
// which only extends to today. Colored via the app's existing
// text-positive/text-negative tokens (app/globals.css) so it stays
// theme-aware like the rest of the app.
export function BudgetRateChart({
  totalAllocation,
  daysInMonth,
  currentDay,
  actualByDay,
  height = 180,
}: {
  totalAllocation: number;
  daysInMonth: number;
  currentDay: number;
  actualByDay: number[];
  height?: number;
}) {
  const width = 400;
  const padding = 8;

  const paceAtDay = (day: number) => (totalAllocation / daysInMonth) * day;
  const maxY = Math.max(totalAllocation, ...actualByDay, 1);

  const x = (day: number) => padding + (day / daysInMonth) * (width - padding * 2);
  const y = (amount: number) => height - padding - (amount / maxY) * (height - padding * 2);

  const pacePoints = [
    [x(0), y(0)],
    [x(daysInMonth), y(paceAtDay(daysInMonth))],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");

  const actualPoints = [[x(0), y(0)], ...actualByDay.map((amount, i) => [x(i + 1), y(amount)])]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");

  const actualToday = actualByDay[actualByDay.length - 1] ?? 0;
  const paceToday = paceAtDay(currentDay);
  const overPace = actualToday > paceToday;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Budget spending pace: ${overPace ? "ahead of" : "on or under"} pace for the month`}
    >
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        className="stroke-border"
        strokeWidth={1}
      />
      <polyline
        points={pacePoints}
        fill="none"
        className="stroke-muted"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      {actualByDay.length > 0 && (
        <polyline
          points={actualPoints}
          fill="none"
          className={overPace ? "stroke-negative" : "stroke-positive"}
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
