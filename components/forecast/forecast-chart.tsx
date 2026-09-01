import { formatMonthYear } from "@/lib/forecast/month";
import type { ForecastPoint } from "@/lib/forecast/project";

// Pure inline SVG, no charting dependency — same viewBox/polyline approach
// as components/budgets/budget-rate-chart.tsx, but a single series (there's
// only one balance to project) and, unlike that chart, the y-scale must
// account for a negative balance (a forecast can legitimately dip below
// zero when expenses outpace the monthly transfer).
export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const width = 800;
  const height = 240;
  const padding = 32;

  const values = points.map((p) => p.value);
  const maxY = Math.max(...values, 0);
  const minY = Math.min(...values, 0);
  const range = maxY - minY || 1;

  const x = (i: number) =>
    padding + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (width - padding * 2));
  const y = (value: number) => height - padding - ((value - minY) / range) * (height - padding * 2);

  const linePoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const zeroY = y(0);
  const endValue = points[points.length - 1]?.value ?? 0;
  const startValue = points[0]?.value ?? 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label={`Projected balance over the next ${points.length} months, ending around ${Math.round(endValue)}`}
    >
      {minY < 0 && maxY > 0 && (
        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}
      <polyline
        points={linePoints}
        fill="none"
        className={endValue < startValue ? "stroke-negative" : "stroke-positive"}
        strokeWidth={2}
      />
      {points.map((p, i) => (
        <text
          key={p.monthISO}
          x={x(i)}
          y={height - padding + 16}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {formatMonthYear(p.monthISO)}
        </text>
      ))}
    </svg>
  );
}
