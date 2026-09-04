"use client";

import { monthLabel } from "@/lib/dates";
import { useSetSearchParams } from "@/components/transactions/column-filter";
import { Select } from "@/components/ui/select";

// The 4 months the Dashboard can be scoped to: the current (partial) month
// plus the 3 full calendar months before it — deliberately the same window
// purge_expired_data() keeps, so nothing offered here can ever have been
// purged. useSetSearchParams is shared with the Transactions page's column
// filters (components/transactions/column-filter.tsx) — it's generic (just
// merges one param into the URL), not actually transactions-specific.
//
// currentMonthISO is passed in rather than computed here: "this month"
// depends on the user's settings.timezone, which only the server has.
// Selecting it clears the param instead of pinning it, so the page keeps
// following the calendar forward.
export function MonthPicker({
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
    <Select
      uiSize="sm"
      className="w-44"
      value={selected}
      onChange={(monthISO) => setParams({ month: monthISO === currentMonthISO ? null : monthISO })}
    >
      {months.map((monthISO) => (
        <option key={monthISO} value={monthISO}>
          {monthLabel(monthISO)}
        </option>
      ))}
    </Select>
  );
}
