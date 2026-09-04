"use client";

import { useActionState, useState } from "react";
import { createForecastEntry } from "@/lib/actions/forecasts";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { ForecastEntryRow } from "@/components/forecast/forecast-entry-row";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Input } from "@/components/ui/input";

type ForecastEntry = {
  id: string;
  month: string;
  description: string;
  isExpense: boolean;
  amount: number;
  updatedAt: string;
};

type MonthOption = { value: string; label: string };

// Bottom-of-page manual entries table — a separate add-form above a plain
// list, same shape as SinkingExpensesTable/manual-transaction-form.tsx, not
// inline-in-table. No virtualization (unlike the Transactions page's
// transaction-list.tsx): a single forecast's entries are expected to number
// in the tens, not thousands.
export function ForecastEntriesTable({
  forecastId,
  entries,
  decimalPlaces,
  monthOptions,
}: {
  forecastId: string;
  entries: ForecastEntry[];
  decimalPlaces: number;
  // The exact months the graph plots, in graph order — a dropdown instead
  // of free-typed mm/yy, so an entry can never land outside the chart.
  monthOptions: MonthOption[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [, createAction] = useActionState(createForecastEntry.bind(null, forecastId), null);

  return (
    <TableShell columns={["Month", "Description", "Amount", ""]}>
      {entries.map((entry, index) => (
        <ForecastEntryRow
          key={entry.id}
          entry={entry}
          decimalPlaces={decimalPlaces}
          isLast={!showAdd && index === entries.length - 1}
          onAddClick={() => setShowAdd(true)}
          monthOptions={monthOptions}
        />
      ))}

      {entries.length === 0 && !showAdd && (
        <TableEmptyRow colSpan={4} label="Add entry" onClick={() => setShowAdd(true)} />
      )}

      {showAdd && (
        <tr className="border-b border-border bg-surface-subtle last:border-0">
          <td colSpan={4} className="px-4 py-3">
            <form
              action={createAction}
              onSubmit={() => setShowAdd(false)}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                Month
                <Select
                  name="month"
                  uiSize="sm"
                  className="w-28"
                  defaultValue={monthOptions[0]?.value}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Description
                <Input
                  type="text"
                  name="description"
                  required
                  placeholder="e.g. Hotel"
                  className="w-40"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Type
                <Select name="type_choice" uiSize="sm" className="w-28" defaultValue="expense">
                  <option value="expense">Expense</option>
                  <option value="deposit">Deposit</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Amount
                <Input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  onKeyDown={stepAmountByDollar}
                  className="w-24"
                />
              </label>

              <Button type="submit" variant="accent" size="sm">
                Add
              </Button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="pb-2 text-xs text-muted hover:underline"
              >
                Cancel
              </button>
            </form>
          </td>
        </tr>
      )}
    </TableShell>
  );
}
