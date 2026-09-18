"use client";

import { useActionState, useState } from "react";
import { importBankConnectionRange } from "@/lib/actions/simplefin";
import { MAX_IMPORT_DAYS, daysBetween } from "@/lib/sources/import-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImportTransactionsForm({ connectionId }: { connectionId: string }) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [state, formAction, pending] = useActionState(
    importBankConnectionRange.bind(null, connectionId),
    null,
  );

  // useActionState has no "onSuccess" callback — clear the inputs once a
  // successful submit lands (state.count present, no error), adjusted from
  // fresh state during render (React's recommended pattern) rather than in
  // a useEffect, same as SinkingExpenseRow's equivalent prev-value diff.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state && state.count !== undefined) {
      setStartDate("");
      setEndDate("");
    }
  }

  const days = daysBetween(startDate, endDate);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        Import
      </Button>

      {open && (
        <form
          action={formAction}
          className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border bg-surface-subtle p-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            From
            <Input
              type="date"
              name="start_date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            To
            <Input
              type="date"
              name="end_date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          {days !== null && (
            <span className={`pb-2 text-xs ${days > MAX_IMPORT_DAYS ? "text-negative" : "text-muted"}`}>
              {days} day{days === 1 ? "" : "s"}
            </span>
          )}
          <Button type="submit" variant="accent" size="sm" disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </form>
      )}

      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
      {state?.count !== undefined && (
        <p className="text-xs text-positive">
          Imported {state.count} transaction{state.count === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
