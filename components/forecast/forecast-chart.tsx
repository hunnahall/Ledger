import { formatMonthYear } from "@/lib/forecast/month";
import { formatMoney } from "@/lib/format";
import type { ForecastPoint } from "@/lib/forecast/project";

const Y_TICKS = 4;

// Pure inline SVG, no charting dependency — same viewBox/polyline approach
// as components/budgets/budget-rate-chart.tsx, but a single series (there's
// only one balance to project) and, unlike that chart, the y-scale must
// account for a negative balance (a forecast can legitimately dip below
// zero when expenses outpace the monthly transfer).
export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const width = 800;
  const height = 240;
  const padding = 32;
  const leftPadding = 56;

  const values = points.map((p) => p.value);
  const maxY = Math.max(...values, 0);
  const minY = Math.min(...values, 0);
  const range = maxY - minY || 1;

  const x = (i: number) =>
    leftPadding +
    (points.length <= 1 ? 0 : (i / (points.length - 1)) * (width - leftPadding - padding));
  const y = (value: number) => height - padding - ((value - minY) / range) * (height - padding * 2);

  const linePoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const zeroY = y(0);
  const endValue = points[points.length - 1]?.value ?? 0;
  const startValue = points[0]?.value ?? 0;

  const yTickValues = Array.from({ length: Y_TICKS + 1 }, (_, i) => minY + (range * i) / Y_TICKS);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label={`Projected balance over the next ${points.length} months, ending around ${Math.round(endValue)}`}
    >
      {yTickValues.map((value) => (
        <g key={value}>
          <line
            x1={leftPadding}
            y1={y(value)}
            x2={width - padding}
            y2={y(value)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={leftPadding - 8}
            y={y(value)}
            dy={4}
            textAnchor="end"
            className="fill-muted text-[10px]"
          >
            {formatMoney(value, 0)}
          </text>
        </g>
      ))}
      {minY < 0 && maxY > 0 && (
        <line
          x1={leftPadding}
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
