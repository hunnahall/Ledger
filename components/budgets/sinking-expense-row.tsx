"use client";

import { useState } from "react";
import {
  deleteSinkingExpense,
  updateSinkingExpense,
} from "@/lib/actions/sinking-expenses";
import {
  SINKING_FREQUENCIES,
  SINKING_FREQUENCY_LABELS,
  type SinkingContributionType,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { ExpandableRow } from "@/components/budgets/expandable-row";

type SinkingExpense = {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
  contribution_type: string;
  target_amount: number | null;
  target_date: string | null;
  monthly_amount: number;
  updated_at: string;
};

export function SinkingExpenseRow({
  expense,
  decimalPlaces,
  isLast,
  onRequestAdd,
}: {
  expense: SinkingExpense;
  decimalPlaces: number;
  isLast: boolean;
  onRequestAdd: () => void;
}) {
  const [mode, setMode] = useState<SinkingContributionType>(
    expense.contribution_type === "goal" ? "goal" : "frequency",
  );

  // The row keeps a stable key (just expense.id) across saves so React
  // updates this DOM subtree in place rather than remounting it — a full
  // remount on every save was fighting password-manager extensions that
  // inject overlays into page inputs. Adjust from fresh props here during
  // render instead (React's recommended pattern, rather than
  // setState-in-effect).
  const [prevContributionType, setPrevContributionType] = useState(expense.contribution_type);
  if (expense.contribution_type !== prevContributionType) {
    setPrevContributionType(expense.contribution_type);
    setMode(expense.contribution_type === "goal" ? "goal" : "frequency");
  }

  return (
    <ExpandableRow
      colSpan={3}
      isLast={isLast}
      addLabel="Add sinking expense"
      expandLabel="Edit sinking expense"
      collapseLabel="Collapse details"
      onAddClick={onRequestAdd}
      updateAction={updateSinkingExpense.bind(null, expense.id)}
      deleteAction={deleteSinkingExpense.bind(null, expense.id)}
      compactCells={
        <>
          <td className="px-4 py-3 font-medium">{expense.name}</td>
          <td className="px-4 py-3">
            <Money amount={expense.monthly_amount} decimalPlaces={decimalPlaces} />/mo
          </td>
        </>
      }
    >
      <input
        key={`name-${expense.updated_at}`}
        type="text"
        name="name"
        defaultValue={expense.name}
        required
        className="w-32 rounded-md border border-border bg-background px-3 py-1.5"
      />

      <Select
        key={`contribution_type-${expense.updated_at}`}
        name="contribution_type"
        uiSize="sm"
        className="w-28"
        value={mode}
        onChange={(value) => setMode(value as SinkingContributionType)}
      >
        <option value="frequency">Frequency</option>
        <option value="goal">Goal</option>
      </Select>

      {mode === "frequency" ? (
        <>
          <input
            key={`amount-${expense.updated_at}`}
            type="number"
            name="amount"
            step="0.01"
            min="0"
            onKeyDown={stepAmountByDollar}
            defaultValue={expense.amount}
            className="w-24 rounded-md border border-border bg-background px-3 py-1.5"
          />
          <Select
            key={`frequency-${expense.updated_at}`}
            name="frequency"
            defaultValue={expense.frequency ?? "annual"}
            className="w-32"
          >
            {SINKING_FREQUENCIES.map((frequency: SinkingFrequency) => (
              <option key={frequency} value={frequency}>
                {SINKING_FREQUENCY_LABELS[frequency]}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <>
          <input
            key={`target_amount-${expense.updated_at}`}
            type="number"
            name="target_amount"
            step="0.01"
            min="0"
            onKeyDown={stepAmountByDollar}
            placeholder="Target amount"
            defaultValue={expense.target_amount ?? 0}
            className="w-28 rounded-md border border-border bg-background px-3 py-1.5"
          />
          <input
            key={`target_date-${expense.updated_at}`}
            type="date"
            name="target_date"
            defaultValue={expense.target_date ?? ""}
            required={mode === "goal"}
            className="w-36 rounded-md border border-border bg-background px-3 py-1.5"
          />
        </>
      )}
    </ExpandableRow>
  );
}
