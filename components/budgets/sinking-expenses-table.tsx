"use client";

import { useActionState, useState } from "react";
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
import { TableShell, TableEmptyRow } from "@/components/ui/table-shell";
import { Card } from "@/components/ui/card";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";
import { Input } from "@/components/ui/input";

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
  decimalPlaces,
}: {
  sinkingExpenses: SinkingExpense[];
  decimalPlaces: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<SinkingContributionType>("frequency");
  const [, createAction] = useActionState(createSinkingExpense, null);

  return (
    <Card
      id="block:sinking-expenses"
      title="Sinking Expenses"
      action={
        <Button type="button" size="sm" onClick={() => setShowAdd(true)}>
          <AddIcon size={16} />
          Add sinking expense
        </Button>
      }
      className="scroll-mt-6"
    >
      <TableShell
        bare
        columns={["Sinking expense", "Type", { label: "Monthly", align: "right" }, ""]}
        footer={
          sinkingExpenses.length > 0 && (
            <tr className="h-9">
              <td className="px-4" colSpan={2}>Total</td>
              <td className="px-4 text-right">
                <Money
                  amount={sinkingExpenses.reduce((sum, e) => sum + e.monthly_amount, 0)}
                  decimalPlaces={decimalPlaces}
                  symbol={false}
                />
              </td>
              <td />
            </tr>
          )
        }
      >
        {sinkingExpenses.map((expense) => (
          <SinkingExpenseRow
            key={expense.id}
            expense={expense}
            decimalPlaces={decimalPlaces}
          />
        ))}

        {sinkingExpenses.length === 0 && !showAdd && (
          <TableEmptyRow colSpan={4} label="No sinking expenses yet." />
        )}

        {showAdd && (
          <tr className="border-b border-border bg-surface-subtle">
            <td colSpan={4} className="px-4 py-3">
              <form
                action={createAction}
                onSubmit={() => {
                  setShowAdd(false);
                  setMode("frequency");
                }}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="flex flex-col gap-1 text-sm">
                  New sinking expense
                  <Input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Car insurance"
                    className="w-32"
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
                      <Input
                        type="number"
                        name="amount"
                        step="0.01"
                        min="0"
                        onKeyDown={stepAmountByDollar}
                        defaultValue={0}
                        className="w-24"
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
                      <Input
                        type="number"
                        name="target_amount"
                        step="0.01"
                        min="0"
                        onKeyDown={stepAmountByDollar}
                        defaultValue={0}
                        className="w-28"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Target date
                      <Input
                        type="date"
                        name="target_date"
                        required={mode === "goal"}
                        className="w-36"
                      />
                    </label>
                  </>
                )}

                <Button type="submit" variant="primary" size="sm">
                  Add
                </Button>
                <Button type="button" variant="tertiary" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </form>
            </td>
          </tr>
        )}
      </TableShell>
    </Card>
  );
}
