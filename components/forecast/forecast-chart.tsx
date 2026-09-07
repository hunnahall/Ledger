"use client";

import { useRef, useState } from "react";
import { formatMonthYear } from "@/lib/forecast/month";
import { formatMoney } from "@/lib/format";
import type { ForecastPoint } from "@/lib/forecast/project";

const Y_TICK_STEP = 500;

// Pure inline SVG, no charting dependency. viewBox stays uniformly scaled
// (the default xMidYMid meet, never "none" -- see budget-rate-chart.tsx for
// what a non-uniform stretch does to axis-label glyphs) and the container
// locks its aspect-ratio to match the viewBox exactly, so there's no
// letterboxing to eat into the plot area and no scale mismatch to blur
// strokes/text. Sizing up is done by growing the viewBox itself (more room
// between gridlines and between months) rather than just stretching a small
// viewBox into a bigger box, which would only magnify the same cramped
// layout -- including the text -- without adding real space.
export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const width = 1100;
  const height = 380;
  const padding = 40;
  const leftPadding = 76;
  const plotLeft = leftPadding;
  const plotRight = width - padding;
  const plotTop = padding;
  const plotBottom = height - padding;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const values = points.map((p) => p.value);
  const rawMaxY = Math.max(...values, 0);
  const rawMinY = Math.min(...values, 0);
  // Round the domain out to the nearest tick step so gridlines land on
  // clean multiples (500, 1000, ...) instead of whatever the data happens
  // to produce.
  const maxY = Math.ceil(rawMaxY / Y_TICK_STEP) * Y_TICK_STEP;
  const minY = Math.floor(rawMinY / Y_TICK_STEP) * Y_TICK_STEP;
  const range = maxY - minY || Y_TICK_STEP;

  const x = (i: number) =>
    plotLeft + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (plotRight - plotLeft));
  const y = (value: number) => plotBottom - ((value - minY) / range) * (plotBottom - plotTop);

  const linePoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const zeroY = y(0);
  const endValue = points[points.length - 1]?.value ?? 0;
  const startValue = points[0]?.value ?? 0;
  const seriesTone = endValue < startValue ? "negative" : "positive";

  const yTickValues: number[] = [];
  for (let v = minY; v <= maxY; v += Y_TICK_STEP) yTickValues.push(v);

  // The crosshair snaps to the nearest data position rather than requiring
  // the pointer to land exactly on the line -- readers aim at a month, not
  // a 2px stroke.
  function nearestIndexFromClientX(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const scaleX = width / rect.width;
    const localX = (clientX - rect.left) * scaleX;
    const ratio = points.length <= 1 ? 0 : (localX - plotLeft) / (plotRight - plotLeft);
    return Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hx = hoveredIndex !== null ? x(hoveredIndex) : 0;
  const hy = hovered ? y(hovered.value) : 0;

  const tooltipWidth = 150;
  const tooltipHeight = 54;
  const tooltipOnLeft = hx > width - tooltipWidth - 32;
  const tooltipX = tooltipOnLeft ? hx - tooltipWidth - 16 : hx + 16;
  const tooltipY = Math.max(plotTop - 8, Math.min(hy - tooltipHeight / 2, plotBottom - tooltipHeight));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full font-sans"
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
            x={leftPadding - 10}
            y={y(value)}
            dy={4}
            textAnchor="end"
            className="fill-muted text-[12px] tabular-nums"
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
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <text
          key={p.monthISO}
          x={x(i)}
          y={height - padding + 22}
          textAnchor="middle"
          className="fill-muted text-[12px] tabular-nums"
        >
          {formatMonthYear(p.monthISO)}
        </text>
      ))}

      {hoveredIndex !== null && hovered && (
        <>
          <line
            x1={hx}
            y1={plotTop}
            x2={hx}
            y2={plotBottom}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={hx}
            cy={hy}
            r={5}
            className={seriesTone === "negative" ? "fill-negative" : "fill-positive"}
            stroke="var(--surface)"
            strokeWidth={3}
          />
          <g>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={8}
              className="fill-surface stroke-card-border"
              strokeWidth={1}
            />
            <text
              x={tooltipX + 12}
              y={tooltipY + 24}
              className="fill-foreground text-[15px] font-semibold tabular-nums"
            >
              {formatMoney(hovered.value, 0)}
            </text>
            <text x={tooltipX + 12} y={tooltipY + 41} className="fill-muted text-[11px]">
              {formatMonthYear(hovered.monthISO)}
            </text>
          </g>
        </>
      )}

      {/* One invisible hit layer spanning the whole plot, rather than a
          per-point target -- the crosshair should track the pointer
          continuously and snap to whichever month is closest, not require
          landing on a specific dot. */}
      <rect
        x={plotLeft}
        y={0}
        width={Math.max(0, plotRight - plotLeft)}
        height={height}
        fill="transparent"
        onPointerMove={(e) => setHoveredIndex(nearestIndexFromClientX(e.clientX))}
        onPointerLeave={() => setHoveredIndex(null)}
        style={{ cursor: "crosshair" }}
      />

      {/* Focusable per-point targets so keyboard users get the same
          tooltip a mouse hover shows -- the hit rect above has no notion
          of "next point" via Tab. */}
      {points.map((p, i) => (
        <circle
          key={`focus-${p.monthISO}`}
          cx={x(i)}
          cy={y(p.value)}
          r={14}
          fill="transparent"
          tabIndex={0}
          role="img"
          aria-label={`${formatMonthYear(p.monthISO)}: ${formatMoney(p.value, 0)}`}
          onFocus={() => setHoveredIndex(i)}
          onBlur={() => setHoveredIndex(null)}
          className="focus-visible:outline-none"
        />
      ))}
    </svg>
  );
}
