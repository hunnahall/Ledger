"use client";

import type { ReactNode } from "react";
import type { PieSlice } from "@/lib/dashboard-charts";
import { cn } from "@/lib/cn";

export const TONE_FILL: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "fill-chart-1",
  2: "fill-chart-2",
  3: "fill-chart-3",
  4: "fill-chart-4",
  5: "fill-chart-5",
  6: "fill-chart-6",
  none: "fill-chart-neutral",
};

export const TONE_SWATCH: Record<NonNullable<PieSlice["tone"]> | "none", string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
  6: "bg-chart-6",
  none: "bg-chart-neutral",
};

// A ring of slices (buildSourcePie) with real gaps between them and the total
// in the middle. Hovering a slice or its legend row (`active`) fades the
// others so the one in focus stands out.
export function Donut({
  slices,
  viewBox,
  size,
  ariaLabel,
  active,
  onActive,
  onSelect,
  center,
}: {
  slices: PieSlice[];
  /** The `size` buildSourcePie drew the paths in. */
  viewBox: number;
  /** Rendered width and height in px. */
  size: number;
  ariaLabel: string;
  active: string | null;
  onActive: (key: string | null) => void;
  onSelect?: (key: string) => void;
  center?: ReactNode;
}) {
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`} role="img" aria-label={ariaLabel}>
        {slices.map(
          (s) =>
            s.path && (
              <path
                key={s.key}
                d={s.path}
                fillRule="evenodd"
                className={cn(
                  TONE_FILL[s.tone ?? "none"],
                  "transition-opacity duration-[120ms] ease-standard motion-reduce:transition-none",
                  active !== null && active !== s.key && "opacity-35",
                  onSelect && s.key !== "other" && "cursor-pointer",
                )}
                onMouseEnter={() => onActive(s.key)}
                onMouseLeave={() => onActive(null)}
                onClick={() => onSelect && s.key !== "other" && onSelect(s.key)}
              />
            ),
        )}
      </svg>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}
