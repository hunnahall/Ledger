"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { updateForecastEntry, deleteForecastEntry } from "@/lib/actions/forecasts";
import { formatMonthYear, monthLabel } from "@/lib/forecast/month";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { useInlineEdit } from "@/components/ui/inline-edit";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { AddIcon } from "@/components/ui/icons";

type ForecastEntry = {
  id: string;
  month: string;
  description: string;
  isExpense: boolean;
  amount: number;
  updatedAt: string;
};

type MonthOption = { value: string; label: string };
type TypeChoice = "expense" | "deposit";

// Click straight into a cell to edit the row in place — no caret, no
// separate detail row underneath (see ExpandableRow, still used by the
// Budgets rows this used to share a component with). All three fields edit
// together rather than committing per-cell, same "explicit Save" reasoning
// as VendorRuleRow: blurring one field to tab into the next would otherwise
// fire a premature partial save.
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
  const { editing, setEditing, isPending, error, commit, cancel } = useInlineEdit(
    updateForecastEntry.bind(null, entry.id),
  );

  const currentMonthValue = formatMonthYear(entry.month);
  // An entry dated outside the graph's current window still needs a
  // matching option so the select shows its real value.
  const monthOptionsWithCurrent = monthOptions.some((m) => m.value === currentMonthValue)
    ? monthOptions
    : [{ value: currentMonthValue, label: monthLabel(entry.month) }, ...monthOptions];

  const [month, setMonth] = useState(currentMonthValue);
  const [typeChoice, setTypeChoice] = useState<TypeChoice>(entry.isExpense ? "expense" : "deposit");
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setMonth(currentMonthValue);
    setTypeChoice(entry.isExpense ? "expense" : "deposit");
    setEditing(true);
  }

  function handleCancel() {
    setMonth(currentMonthValue);
    setTypeChoice(entry.isExpense ? "expense" : "deposit");
    cancel();
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("month", month);
    formData.set("description", descriptionRef.current?.value ?? "");
    formData.set("type_choice", typeChoice);
    formData.set("amount", amountRef.current?.value ?? "");
    commit(formData);
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  }

  // The compact cells are the click target, not an actual <button> — this
  // keeps them reachable and activatable from the keyboard too.
  function handleCellKeyDown(event: KeyboardEvent<HTMLTableCellElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startEditing();
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-surface-subtle align-middle last:border-0">
        <td className="px-4 py-2">
          <Select uiSize="sm" className="w-28" value={month} onChange={setMonth}>
            {monthOptionsWithCurrent.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-4 py-2">
          <Input
            ref={descriptionRef}
            type="text"
            defaultValue={entry.description}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={handleFieldKeyDown}
            className="w-40"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Select uiSize="sm" className="w-24" value={typeChoice} onChange={(v) => setTypeChoice(v as TypeChoice)}>
              <option value="expense">Expense</option>
              <option value="deposit">Deposit</option>
            </Select>
            <Input
              ref={amountRef}
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={entry.amount}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                stepAmountByDollar(e);
                handleFieldKeyDown(e);
              }}
              className="w-24"
            />
          </div>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="px-2 py-1 text-xs"
              onClick={handleSave}
              disabled={isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="px-2 py-1 text-xs"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="mt-1 text-xs text-negative">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border align-middle transition-colors duration-[120ms] ease-standard last:border-0 hover:bg-paper-a1">
      <td
        className="cursor-pointer px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
        onClick={startEditing}
        onKeyDown={handleCellKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Edit ${formatMonthYear(entry.month)} entry`}
      >
        {formatMonthYear(entry.month)}
      </td>
      <td
        className="cursor-pointer px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
        onClick={startEditing}
        onKeyDown={handleCellKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Edit ${entry.description} entry`}
      >
        {entry.description}
      </td>
      <td
        className="cursor-pointer px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
        onClick={startEditing}
        onKeyDown={handleCellKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Edit ${entry.description} entry amount`}
      >
        <span className={entry.isExpense ? "text-negative" : "text-positive"}>
          {entry.isExpense ? "−" : "+"}
          <Money amount={entry.amount} decimalPlaces={decimalPlaces} />
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <ActionButtonForm
            action={deleteForecastEntry.bind(null, entry.id)}
            variant="secondary"
            tone="negative"
            size="sm"
            className="px-2 py-1 text-xs"
          >
            Delete
          </ActionButtonForm>
          {isLast && (
            <Button
              type="button"
              variant="accent"
              size="icon"
              aria-label="Add entry"
              onClick={onAddClick}
            >
              <AddIcon />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
