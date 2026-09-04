"use client";

import { updateForecastEntry, deleteForecastEntry } from "@/lib/actions/forecasts";
import { formatMonthYear, monthLabel } from "@/lib/forecast/month";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { ExpandableRow } from "@/components/budgets/expandable-row";
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

export function ForecastEntryRow({
  entry,
  decimalPlaces,
  isLast,
  onAddClick,
  monthOptions,
}: {
  entry: ForecastEntry;
  decimalPlaces: number;
  isLast: boolean;
  onAddClick: () => void;
  monthOptions: MonthOption[];
}) {
  // An entry dated outside the graph's current window (e.g. logged before
  // this month rolled forward) still needs a matching option so the select
  // shows its real value instead of silently falling back to the first one.
  const currentValue = formatMonthYear(entry.month);
  const options = monthOptions.some((m) => m.value === currentValue)
    ? monthOptions
    : [{ value: currentValue, label: monthLabel(entry.month) }, ...monthOptions];
  return (
    <ExpandableRow
      colSpan={4}
      isLast={isLast}
      addLabel="Add entry"
      expandLabel="Edit entry"
      collapseLabel="Collapse details"
      onAddClick={onAddClick}
      updateAction={updateForecastEntry.bind(null, entry.id)}
      deleteAction={deleteForecastEntry.bind(null, entry.id)}
      compactCells={
        <>
          <td className="px-4 py-3">{formatMonthYear(entry.month)}</td>
          <td className="px-4 py-3">{entry.description}</td>
          <td className="px-4 py-3">
            <span className={entry.isExpense ? "text-negative" : "text-positive"}>
              {entry.isExpense ? "−" : "+"}
              <Money amount={entry.amount} decimalPlaces={decimalPlaces} />
            </span>
          </td>
        </>
      }
    >
      <Select
        key={`month-${entry.updatedAt}`}
        name="month"
        uiSize="sm"
        className="w-28"
        defaultValue={currentValue}
      >
        {options.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <Input
        key={`description-${entry.updatedAt}`}
        type="text"
        name="description"
        defaultValue={entry.description}
        required
        className="w-40"
      />
      <Select
        key={`type-${entry.updatedAt}`}
        name="type_choice"
        uiSize="sm"
        className="w-28"
        defaultValue={entry.isExpense ? "expense" : "deposit"}
      >
        <option value="expense">Expense</option>
        <option value="deposit">Deposit</option>
      </Select>
      <Input
        key={`amount-${entry.updatedAt}`}
        type="number"
        name="amount"
        step="0.01"
        min="0.01"
        onKeyDown={stepAmountByDollar}
        defaultValue={entry.amount}
        className="w-24"
      />
    </ExpandableRow>
  );
}
