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
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";

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
  budgetId,
  decimalPlaces,
}: {
  expense: SinkingExpense;
  budgetId: string;
  decimalPlaces: number;
}) {
  const [mode, setMode] = useState<SinkingContributionType>(
    expense.contribution_type === "goal" ? "goal" : "frequency",
  );

  return (
    <tr className="border-b border-border last:border-0">
      <td colSpan={3} className="px-4 py-3">
        <form
          action={updateSinkingExpense.bind(null, expense.id, budgetId)}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            name="name"
            defaultValue={expense.name}
            required
            className="w-32 rounded-md border border-border bg-background px-3 py-1.5"
          />

          <div className="flex items-center gap-3 text-xs text-foreground">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="contribution_type"
                value="frequency"
                checked={mode === "frequency"}
                onChange={() => setMode("frequency")}
              />
              Frequency
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="contribution_type"
                value="goal"
                checked={mode === "goal"}
                onChange={() => setMode("goal")}
              />
              Goal
            </label>
          </div>

          {mode === "frequency" ? (
            <>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                defaultValue={expense.amount}
                className="w-24 rounded-md border border-border bg-background px-3 py-1.5"
              />
              <Select
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
                type="number"
                name="target_amount"
                step="0.01"
                min="0"
                placeholder="Target amount"
                defaultValue={expense.target_amount ?? 0}
                className="w-28 rounded-md border border-border bg-background px-3 py-1.5"
              />
              <input
                type="date"
                name="target_date"
                defaultValue={expense.target_date ?? ""}
                required={mode === "goal"}
                className="w-36 rounded-md border border-border bg-background px-3 py-1.5"
              />
            </>
          )}

          <Button type="submit" size="sm">
            Save
          </Button>
          <Button
            type="submit"
            size="sm"
            tone="negative"
            formAction={deleteSinkingExpense.bind(null, expense.id, budgetId)}
          >
            Delete
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          {expense.contribution_type === "goal" ? (
            <>
              <Money amount={expense.target_amount ?? 0} decimalPlaces={decimalPlaces} /> by{" "}
              {expense.target_date}
            </>
          ) : (
            <>
              <Money amount={expense.amount} decimalPlaces={decimalPlaces} />{" "}
              {SINKING_FREQUENCY_LABELS[
                (expense.frequency ?? "annual") as SinkingFrequency
              ].toLowerCase()}
            </>
          )}{" "}
          &middot; set aside <Money amount={expense.monthly_amount} decimalPlaces={decimalPlaces} />
          /month
        </p>
      </td>
    </tr>
  );
}
