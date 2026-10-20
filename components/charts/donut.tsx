"use client";

import type { ReactNode } from "react";
import type { PieSlice } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";
import { RING, arcDash } from "@/lib/charts/donut";

const TONE_STROKE: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "stroke-chart-1",
  2: "stroke-chart-2",
  3: "stroke-chart-3",
  4: "stroke-chart-4",
  5: "stroke-chart-5",
  6: "stroke-chart-6",
  7: "stroke-chart-7",
  8: "stroke-chart-8",
  none: "stroke-chart-neutral",
};

export const TONE_SWATCH: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
  6: "bg-chart-6",
  7: "bg-chart-7",
  8: "bg-chart-8",
  none: "bg-chart-neutral",
};

// A thin ring of slices (buildSourcePie), drawn as stretches of one circle's
// stroke so the edges are smooth and nothing outlines a slice. The total or
// any other label sits in the middle. Hovering a slice or its legend row
// (`active`) thickens it and fades the others.
export function Donut({
  slices,
  size,
  ariaLabel,
  active,
  onActive,
  onSelect,
  center,
}: {
  slices: PieSlice[];
  /** Rendered width and height in px. */
  size: number;
  ariaLabel: string;
  active: string | null;
  onActive: (key: string | null) => void;
  onSelect?: (key: string) => void;
  center?: ReactNode;
}) {
  const c = RING.size / 2;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${RING.size} ${RING.size}`} role="img" aria-label={ariaLabel}>
        <circle cx={c} cy={c} r={RING.radius} fill="none" strokeWidth={RING.stroke} className="stroke-fill-active" />
        <g transform={`rotate(-90 ${c} ${c})`}>
          {slices.map((s) => {
            const isActive = active === s.key;
            return (
              <circle
                key={s.key}
                cx={c}
                cy={c}
                r={RING.radius}
                fill="none"
                pathLength={100}
                strokeWidth={isActive ? RING.activeStroke : RING.stroke}
                {...arcDash(s.arc)}
                className={cn(
                  TONE_STROKE[s.tone ?? "none"],
                  "transition-[stroke-width,opacity] duration-[200ms] ease-standard motion-reduce:transition-none",
                  active !== null && !isActive && "opacity-35",
                  onSelect && s.key !== "other" && "cursor-pointer",
                )}
                onMouseEnter={() => onActive(s.key)}
                onMouseLeave={() => onActive(null)}
                onClick={() => onSelect && s.key !== "other" && onSelect(s.key)}
              />
            );
          })}
        </g>
      </svg>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}
