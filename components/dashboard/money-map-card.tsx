"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TONE_SWATCH } from "@/components/charts/donut";
import { Money } from "@/components/ui/money";
import type { MoneyMap } from "@/lib/charts/money-map";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ChartTitle } from "@/components/charts/chart-title";

// Where your money sits: one slim bar split by what each Source holds, in
// each Source's stable color (the same as Source Allocation). Segments meet
// with no gap or outline, like the rings; hovering a segment or its legend
// row fades the others. Sources below zero are listed under the bar.
// Clicking a segment opens that Source's transactions.
export function MoneyMapCard({ map, decimalPlaces }: { map: MoneyMap; decimalPlaces: number }) {
  const router = useRouter();
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const filterBy = (sourceId: string) => router.push(`/transactions?source_id=${encodeURIComponent(sourceId)}`);
  const [active, setActive] = useState<string | null>(null);

  if (map.segments.length === 0) {
    return (
      <section className="border border-border bg-surface p-5">
        <ChartTitle className="mb-3">Money Map</ChartTitle>
        <p className="text-sm text-muted">
          No Source holds any money yet.{" "}
          <Link href="/sources" className="underline">
            Go to Sources
          </Link>
        </p>
      </section>
    );
  }

  const label = [`Sources hold ${money(map.total)}:`, ...map.segments.map((s) => `${s.name} ${money(s.amount)}`)].join(", ");

  return (
    <section className="flex min-w-0 flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChartTitle>Money Map</ChartTitle>
        <span className="font-mono text-xs text-muted">
          Sources hold <Money amount={map.total} decimalPlaces={decimalPlaces} />
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div role="group" aria-label={label} className="min-w-[480px] py-2">
          <div className="flex h-3 pointer-coarse:h-6" onMouseLeave={() => setActive(null)}>
            {map.segments.map((s) => {
              const own = s.id !== "other";
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!own}
                  title={`${s.name}: ${money(s.amount)}`}
                  aria-label={own ? `${s.name}: ${money(s.amount)}. Show transactions.` : `${s.name}: ${money(s.amount)}`}
                  onClick={() => own && filterBy(s.id)}
                  onMouseEnter={() => setActive(s.id)}
                  onFocus={() => setActive(s.id)}
                  onBlur={() => setActive(null)}
                  style={{ flexGrow: s.share, flexBasis: 0 }}
                  className={cn(
                    "min-w-px transition-opacity duration-[200ms] ease-standard motion-reduce:transition-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    TONE_SWATCH[s.tone ?? "none"],
                    active !== null && active !== s.id && "opacity-35",
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-x-6 text-[13px] tabular-nums sm:grid-cols-2 lg:grid-cols-3">
        {map.segments.map((s) => (
          <li key={s.id} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}>
            <LegendRow
              swatch={TONE_SWATCH[s.tone ?? "none"]}
              name={s.name}
              amount={s.amount}
              decimalPlaces={decimalPlaces}
              onClick={s.id !== "other" ? () => filterBy(s.id) : undefined}
            />
          </li>
        ))}
      </ul>

      {map.negatives.length > 0 && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
          Below zero, not drawn:{" "}
          {map.negatives.map((s, i) => (
            <span key={s.id} className="whitespace-nowrap">
              {i > 0 && ", "}
              {s.name} <Money amount={s.amount} decimalPlaces={decimalPlaces} />
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function LegendRow({
  swatch,
  name,
  amount,
  decimalPlaces,
  onClick,
}: {
  swatch: string;
  name: string;
  amount: number;
  decimalPlaces: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span aria-hidden="true" className={cn("size-2.5 flex-none", swatch)} />
      <span className="flex-1 truncate">{name}</span>
      <Money amount={amount} decimalPlaces={decimalPlaces} />
    </>
  );
  const cls = "flex min-h-8 w-full items-center gap-2 border-b border-border px-1.5 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "hover:bg-fill-hover")}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}
