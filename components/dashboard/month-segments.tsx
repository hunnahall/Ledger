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
    <div role="group" aria-label="Month" className="flex gap-px border border-border-strong bg-surface p-px">
      {months.map((monthISO) => {
        const active = monthISO === selected;
        return (
          <button
            key={monthISO}
            type="button"
            aria-pressed={active}
            onClick={() => setParams({ month: monthISO === currentMonthISO ? null : monthISO })}
            className={cn(
              "h-[var(--control-md)] px-3.5 text-[13px] transition-colors duration-[120ms] ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              active
                ? "bg-fill-active font-medium text-foreground"
                : "text-foreground-secondary hover:bg-fill-hover",
            )}
          >
            {shortMonthLabel(monthISO)}
          </button>
        );
      })}
    </div>
  );
}
