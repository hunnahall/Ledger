"use client";

import { useActionState } from "react";
import { updateBudgetType } from "@/lib/actions/settings";
import type { BudgetType } from "@/lib/queries/settings";

export function BudgetTypeForm({ budgetType }: { budgetType: BudgetType }) {
  const [state, formAction] = useActionState(updateBudgetType, null);

  return (
    <form action={formAction} className="flex flex-col gap-2 text-sm">
      <p className="font-medium">Budget type</p>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="budget_type"
          value="rolling"
          defaultChecked={budgetType === "rolling"}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        Rolling
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="budget_type"
          value="advanced"
          defaultChecked={budgetType === "advanced"}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        Advanced
      </label>
      <p className="text-sm text-muted">
        Rolling: spend income as it arrives; the Income source starts each month at $0. Advanced:
        this month&apos;s income pays for next month, so each month starts with last month&apos;s
        income to spend down to $0.
      </p>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
