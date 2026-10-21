"use client";

import { compactMoney } from "@/components/dashboard/format";
import { formatDate } from "@/lib/format";
import type { BalancePoint } from "@/lib/sources/balance-history";

const W = 600;
const H = 140;

// One Source's balance by day: a 1.5px line in the signature color, solid
// where the balance was recorded and dashed where it's estimated. The
// vertical range fits the data (balances can go below zero), with a zero line
// when zero is in range. Every day is a hover target with its date and
// balance. Axes are mono 11px in --fg-3.
export function BalanceChart({
  points,
  formatValue,
  ariaLabel,
  height = 140,
}: {
  points: BalancePoint[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const values = points.map((p) => p.balance);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.max(Math.abs(hi), 1)) * 0.08;
  const min = lo - pad;
  const max = hi + pad;
  const n = Math.max(points.length, 1);
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const coords = points.map((p, i) => `${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`);

  // The estimated stretch ends where the recorded one begins; the two share
  // that boundary point so the line has no gap.
  const firstRecorded = points.findIndex((p) => !p.estimated);
  const split = firstRecorded < 0 ? points.length : firstRecorded;
  const estimated = coords.slice(0, Math.min(split + 1, points.length));
  const recorded = coords.slice(Math.max(split, 0));

  const ticks = [max, (max + min) / 2, min];
  const zeroInRange = min < 0 && max > 0;
  const labelIdx = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col justify-between text-right font-mono text-[11px] tabular-nums text-muted" style={{ height }}>
        {ticks.map((t, i) => (
          <span key={i}>{compactMoney(t)}</span>
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
            <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-border" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-strong" vectorEffect="non-scaling-stroke" />
            {zeroInRange && (
              <line
                x1={0}
                x2={W}
                y1={y(0)}
                y2={y(0)}
                className="stroke-foreground-secondary"
                strokeDasharray="2 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {estimated.length > 1 && (
              <polyline
                points={estimated.join(" ")}
                fill="none"
                className="stroke-accent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {recorded.length > 1 && (
              <polyline
                points={recorded.join(" ")}
                fill="none"
                className="stroke-accent"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex">
            {points.map((p) => (
              <span
                key={p.date}
                title={`${formatDate(p.date)}: ${formatValue(p.balance)}${p.estimated ? " (estimated)" : ""}`}
                className="h-full min-w-0 flex-1 border-x border-transparent transition-colors duration-[120ms] hover:border-border-strong hover:bg-fill-hover"
              />
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-muted">
          {labelIdx.map((i) => (
            <span key={i}>{points[i] ? axisDate(points[i].date) : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function axisDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
