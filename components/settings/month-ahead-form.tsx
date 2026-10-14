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
      <p className="text-sm text-muted">
        On: start each month with last month&apos;s income and spend it down to $0. Off: spend
        income as it arrives; the Income source starts each month at $0.
      </p>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
