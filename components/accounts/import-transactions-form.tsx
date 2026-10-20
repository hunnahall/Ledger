"use client";

import { useActionState, useState } from "react";
import { importBankConnectionRange } from "@/lib/actions/simplefin";
import { MAX_IMPORT_DAYS, daysBetween } from "@/lib/sources/import-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The Import dialog: backfill one connection's transactions for a date
// range of up to MAX_IMPORT_DAYS. Re-importing a range is safe.
export function ImportTransactionsForm({ connectionId, onDone }: { connectionId: string; onDone: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [state, formAction, pending] = useActionState(
    importBankConnectionRange.bind(null, connectionId),
    null,
  );
  const days = daysBetween(startDate, endDate);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Import Transactions</h2>
        <p className="mt-1 text-sm text-muted">
          Pull in up to {MAX_IMPORT_DAYS} days at a time. Importing a range twice is safe.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          From
          <Input
            type="date"
            name="start_date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <Input type="date" name="end_date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        {days !== null && (
          <span className={`pb-2 font-mono text-xs ${days > MAX_IMPORT_DAYS ? "text-danger" : "text-muted"}`}>
            {days} day{days === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      {state?.count !== undefined && (
        <p className="text-xs text-foreground-secondary">
          Imported {state.count} transaction{state.count === 1 ? "" : "s"}.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onDone}>
          {state?.count !== undefined ? "Done" : "Cancel"}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Importing" : "Import"}
        </Button>
      </div>
    </form>
  );
}
