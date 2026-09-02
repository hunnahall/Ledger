"use client";

import { currentMonthISO } from "@/lib/dates";
import { useSetSearchParams } from "@/components/transactions/column-filter";
import { Select } from "@/components/ui/select";

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
    <Select
      uiSize="sm"
      className="w-44"
      value={selected}
      onChange={(monthISO) => setParams({ month: monthISO === currentMonthISO() ? null : monthISO })}
    >
      {months.map((monthISO) => (
        <option key={monthISO} value={monthISO}>
          {monthLabel(monthISO)}
        </option>
      ))}
    </Select>
  );
}
