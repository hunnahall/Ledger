"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TONE_SWATCH } from "@/components/charts/donut";
import { Money } from "@/components/ui/money";
import type { MoneyMap } from "@/lib/charts/money-map";
import { NO_SOURCE_FILTER_VALUE } from "@/lib/transactions/filters";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

// Where the cash in your accounts sits: one bar split by the Sources holding
// it, in each Source's stable color (the same as Source Allocation). Cash no
// Source holds shows as a dashed warning segment; Sources holding more than
// the cash run past a tick where the cash ends. Clicking a segment opens
// that Source's transactions; Unassigned opens the ones with no Source.
export function MoneyMapCard({ map, decimalPlaces }: { map: MoneyMap; decimalPlaces: number }) {
  const router = useRouter();
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const filterBy = (sourceId: string) => router.push(`/transactions?source_id=${encodeURIComponent(sourceId)}`);

  if (map.empty) {
    return (
      <section className="border border-border bg-surface p-5">
        <h2 className="mb-2 text-base font-semibold">Money Map</h2>
        <p className="text-sm text-muted">
          Connect a bank to see where your cash sits.{" "}
          <Link href="/accounts" className="underline">
            Go to Accounts
          </Link>
        </p>
      </section>
    );
  }

  const label = [
    `Cash ${money(map.cash)} split by Source:`,
    ...map.segments.map((s) => `${s.name} ${money(s.amount)}`),
    map.status === "under" && `Unassigned ${money(map.unassigned)}`,
    map.status === "over" && `Sources hold ${money(-map.unassigned)} more than the cash`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="flex min-w-0 flex-col border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Money Map</h2>
        <span className="font-mono text-xs text-muted">
          Cash <Money amount={map.cash} decimalPlaces={decimalPlaces} />
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div role="group" aria-label={label} className="relative min-w-[480px] py-1.5">
          <div className="flex h-6 gap-px pointer-coarse:h-10">
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
                  style={{ flexGrow: s.share, flexBasis: 0 }}
                  className={cn(
                    "min-w-px transition-opacity duration-[120ms] ease-standard motion-reduce:transition-none",
                    TONE_SWATCH[s.tone ?? "none"],
                    own && "hover:opacity-80",
                  )}
                />
              );
            })}
            {map.status === "under" && (
              <button
                type="button"
                title={`Unassigned: ${money(map.unassigned)}`}
                aria-label={`Unassigned: ${money(map.unassigned)}. Show transactions with no Source.`}
                onClick={() => filterBy(NO_SOURCE_FILTER_VALUE)}
                style={{ flexGrow: map.unassignedShare, flexBasis: 0 }}
                className="min-w-px border border-dashed border-warning bg-warning-soft hover:bg-warning/25"
              />
            )}
          </div>
          {map.cashMark !== null && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: `${map.cashMark * 100}%` }}
            />
          )}
        </div>
      </div>

      <p className="mt-3 inline-flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            map.status === "exact" ? "bg-success" : map.status === "under" ? "bg-warning" : "bg-danger",
          )}
        />
        {map.status === "exact" && "Every dollar is assigned"}
        {map.status === "under" && (
          <>
            Unassigned <Money amount={map.unassigned} decimalPlaces={decimalPlaces} />
          </>
        )}
        {map.status === "over" && (
          <span className="text-danger">
            Sources hold <Money amount={-map.unassigned} decimalPlaces={decimalPlaces} /> more than your cash
          </span>
        )}
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-x-6 text-[13px] tabular-nums sm:grid-cols-2 lg:grid-cols-3">
        {map.segments.map((s) => (
          <li key={s.id}>
            <LegendRow
              swatch={TONE_SWATCH[s.tone ?? "none"]}
              name={s.name}
              amount={s.amount}
              decimalPlaces={decimalPlaces}
              onClick={s.id !== "other" ? () => filterBy(s.id) : undefined}
            />
          </li>
        ))}
        {map.status === "under" && (
          <li>
            <LegendRow
              swatch="border border-dashed border-warning bg-warning-soft"
              name="Unassigned"
              amount={map.unassigned}
              decimalPlaces={decimalPlaces}
              onClick={() => filterBy(NO_SOURCE_FILTER_VALUE)}
            />
          </li>
        )}
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
