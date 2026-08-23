"use client";

import { useState } from "react";
import { createSinkingExpense } from "@/lib/actions/sinking-expenses";
import {
  SINKING_FREQUENCIES,
  SINKING_FREQUENCY_LABELS,
  type SinkingContributionType,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { SinkingExpenseRow } from "@/components/budgets/sinking-expense-row";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

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

export function SinkingExpensesTable({
  sinkingExpenses,
  budgetId,
  decimalPlaces,
}: {
  sinkingExpenses: SinkingExpense[];
  budgetId: string;
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<SinkingContributionType>("frequency");

  return (
    <div className="rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Sinking expense</th>
            <th className="px-4 py-3 font-medium">Monthly</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sinkingExpenses.map((expense, index) => (
            <SinkingExpenseRow
              key={expense.id}
              expense={expense}
              budgetId={budgetId}
              decimalPlaces={decimalPlaces}
              isLast={!showAdd && index === sinkingExpenses.length - 1}
              onRequestAdd={() => setShowAdd(true)}
            />
          ))}

          {sinkingExpenses.length === 0 && !showAdd && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center">
                <Button
                  type="button"
                  variant="accent"
                  size="icon"
                  aria-label="Add sinking expense"
                  onClick={() => setShowAdd(true)}
                >
                  <AddIcon />
                </Button>
              </td>
            </tr>
          )}

          {showAdd && (
            <tr className="border-b border-border bg-surface-subtle last:border-0">
              <td colSpan={3} className="px-4 py-3">
                <form
                  action={createSinkingExpense.bind(null, budgetId)}
                  onSubmit={() => {
                    setShowAdd(false);
                    setMode("frequency");
                  }}
                  className="flex flex-wrap items-end gap-3"
                >
                  <label className="flex flex-col gap-1 text-sm">
                    New sinking expense
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Car insurance"
                      className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    Type
                    <Select
                      name="contribution_type"
                      uiSize="sm"
                      className="w-28"
                      value={mode}
                      onChange={(value) => setMode(value as SinkingContributionType)}
                    >
                      <option value="frequency">Frequency</option>
                      <option value="goal">Goal</option>
                    </Select>
                  </label>

                  {mode === "frequency" ? (
                    <>
                      <label className="flex flex-col gap-1 text-sm">
                        Amount
                        <input
                          type="number"
                          name="amount"
                          step="0.01"
                          min="0"
                          onKeyDown={stepAmountByDollar}
                          defaultValue={0}
                          className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        Frequency
                        <Select name="frequency" defaultValue="annual" className="w-36">
                          {SINKING_FREQUENCIES.map((frequency: SinkingFrequency) => (
                            <option key={frequency} value={frequency}>
                              {SINKING_FREQUENCY_LABELS[frequency]}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="flex flex-col gap-1 text-sm">
                        Target amount
                        <input
                          type="number"
                          name="target_amount"
                          step="0.01"
                          min="0"
                          onKeyDown={stepAmountByDollar}
                          defaultValue={0}
                          className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        Target date
                        <input
                          type="date"
                          name="target_date"
                          required={mode === "goal"}
                          className="w-36 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  )}

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
        </tbody>
      </table>
    </div>
  );
}
