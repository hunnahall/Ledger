"use client";

import { useActionState } from "react";
import { updateBudgetType } from "@/lib/actions/settings";
import type { BudgetType } from "@/lib/queries/settings";

// Saves as soon as a choice is picked.
export function BudgetTypeForm({ budgetType }: { budgetType: BudgetType }) {
  const [state, formAction] = useActionState(updateBudgetType, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1 text-sm">
      <div className="flex gap-4">
        {(["rolling", "advanced"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 capitalize">
            <input
              type="radio"
              name="budget_type"
              value={value}
              defaultChecked={budgetType === value}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="accent-[var(--accent)]"
            />
            {value}
          </label>
        ))}
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
