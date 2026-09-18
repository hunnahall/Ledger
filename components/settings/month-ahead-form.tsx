"use client";

import { useActionState } from "react";
import { updateMonthAhead } from "@/lib/actions/settings";

export function MonthAheadForm({ monthAhead }: { monthAhead: boolean }) {
  const [state, formAction] = useActionState(updateMonthAhead, null);

  return (
    <form action={formAction} className="flex flex-col gap-1 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="month_ahead"
          defaultChecked={monthAhead}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        Month Ahead
      </label>
      <p className="text-xs text-muted">
        Allows for income earned this month to be stored and used next month.
      </p>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
