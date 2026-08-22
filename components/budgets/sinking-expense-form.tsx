"use client";

import { useState } from "react";
import { createSinkingExpense } from "@/lib/actions/sinking-expenses";
import {
  SINKING_FREQUENCIES,
  SINKING_FREQUENCY_LABELS,
  type SinkingContributionType,
  type SinkingFrequency,
} from "@/lib/budgets/sinking";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function SinkingExpenseForm({ budgetId }: { budgetId: string }) {
  const [mode, setMode] = useState<SinkingContributionType>("frequency");

  return (
    <form
      action={createSinkingExpense.bind(null, budgetId)}
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

      <div className="flex items-center gap-3 pb-2 text-xs text-foreground">
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
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
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

      <Button type="submit" variant="accent">
        Add sinking expense
      </Button>
    </form>
  );
}
