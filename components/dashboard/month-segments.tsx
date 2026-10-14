"use client";

import { useSetSearchParams } from "@/components/transactions/column-filter";
import { cn } from "@/lib/cn";
import { shortMonthLabel } from "@/components/dashboard/format";

// The 4 months the Dashboard can be scoped to (current + the 3 full months
// purge_expired_data keeps), as a segmented control, newest first. Picking
// the current month clears the param so the page keeps following the
// calendar forward.
export function MonthSegments({
  months,
  selected,
  currentMonthISO,
}: {
  months: string[];
  selected: string;
  currentMonthISO: string;
}) {
  const setParams = useSetSearchParams();

  return (
    <div role="group" aria-label="Month" className="flex gap-0.5 rounded-lg border border-border bg-surface-subtle p-[3px]">
      {months.map((monthISO) => {
        const active = monthISO === selected;
        return (
          <button
            key={monthISO}
            type="button"
            aria-pressed={active}
            onClick={() => setParams({ month: monthISO === currentMonthISO ? null : monthISO })}
            className={cn(
              "min-h-9 rounded-md px-3.5 text-sm transition-colors duration-[120ms] ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              active
                ? "bg-surface font-medium text-foreground shadow-xs"
                : "text-foreground-secondary hover:bg-paper-a2",
            )}
          >
            {shortMonthLabel(monthISO)}
          </button>
        );
      })}
    </div>
  );
}
