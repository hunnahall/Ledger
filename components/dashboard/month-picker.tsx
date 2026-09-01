"use client";

import { currentMonthISO } from "@/lib/dates";
import { useSetSearchParams } from "@/components/transactions/column-filter";
import { cn } from "@/lib/cn";

function monthLabel(monthISO: string) {
  return new Date(`${monthISO}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The 4 months the Dashboard can be scoped to: the current (partial) month
// plus the 3 full calendar months before it — deliberately the same window
// purge_expired_data() keeps, so nothing offered here can ever have been
// purged. useSetSearchParams is shared with the Transactions page's column
// filters (components/transactions/column-filter.tsx) — it's generic (just
// merges one param into the URL), not actually transactions-specific.
export function MonthPicker({ months, selected }: { months: string[]; selected: string }) {
  const setParams = useSetSearchParams();

  return (
    <div className="flex flex-wrap gap-1.5">
      {months.map((monthISO) => (
        <button
          key={monthISO}
          type="button"
          onClick={() => setParams({ month: monthISO === currentMonthISO() ? null : monthISO })}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs",
            monthISO === selected
              ? "border-foreground bg-foreground text-surface"
              : "border-border bg-transparent hover:bg-background",
          )}
        >
          {monthLabel(monthISO)}
        </button>
      ))}
    </div>
  );
}
