"use client";

import { compactMoney, niceCeiling } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";

export type AreaPoint = { key: string; label: string; value: number };

const W = 600;
const H = 140;

// One series over time: a 1.5px line in the signature color over a flat,
// low-strength fill. Every day is a button over the plot, so clicking a point
// opens the transactions behind it. Axes are mono 11px in --fg-3.
export function AreaChart({
  data,
  onSelect,
  formatValue,
  ariaLabel,
  reference,
  selectedKey,
  height = 140,
}: {
  data: AreaPoint[];
  onSelect?: (key: string) => void;
  formatValue: (value: number) => string;
  ariaLabel: string;
  /** A budget or target drawn as a 1px dashed line with a mono label. */
  reference?: { value: number; label: string };
  selectedKey?: string | null;
  /** Plot height in px. */
  height?: number;
}) {
  const max = niceCeiling(Math.max(1, reference?.value ?? 0, ...data.map((d) => d.value)));
  const n = Math.max(data.length, 1);
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const ticks = [1, 0.5, 0].map((f) => f * max);
  const labelIdx = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col justify-between text-right font-mono text-[11px] tabular-nums text-muted" style={{ height }}>
        {ticks.map((t) => (
          <span key={t}>{compactMoney(t)}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            role="img"
            aria-label={ariaLabel}
          >
            {ticks.slice(0, -1).map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} className="stroke-border" vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
            {reference && (
              <line
                x1={0}
                x2={W}
                y1={y(reference.value)}
                y2={y(reference.value)}
                className="stroke-foreground-secondary"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {data.length > 1 && (
              <>
                <polygon points={`0,${H} ${points.join(" ")} ${W},${H}`} className="fill-accent" fillOpacity={0.14} />
                <polyline points={points.join(" ")} fill="none" className="stroke-accent" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {reference && (
            <span
              className="absolute right-0 -translate-y-full bg-surface px-1 font-mono text-[11px] text-muted"
              style={{ top: `${(y(reference.value) / H) * 100}%` }}
            >
              {reference.label}
            </span>
          )}
          <div className="absolute inset-0 flex">
            {data.map((d) => (
              <button
                key={d.key}
                type="button"
                title={`${d.label}: ${formatValue(d.value)}`}
                aria-label={`${d.label}: ${formatValue(d.value)}${onSelect ? ". Show transactions." : ""}`}
                disabled={!onSelect}
                onClick={() => onSelect?.(d.key)}
                className={cn(
                  "h-full min-w-0 flex-1 border-x border-transparent transition-colors duration-[120ms]",
                  onSelect && "cursor-pointer hover:border-border-strong hover:bg-fill-hover",
                  selectedKey === d.key && "border-border-strong bg-accent-soft",
                )}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-muted">
          {labelIdx.map((i) => (
            <span key={i}>{data[i]?.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
