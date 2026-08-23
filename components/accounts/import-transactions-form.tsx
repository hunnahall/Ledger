"use client";

import { useState, type FormEvent } from "react";
import { importBankConnectionRange } from "@/lib/actions/simplefin";
import { MAX_IMPORT_DAYS, daysBetween } from "@/lib/sources/import-range";
import { Button } from "@/components/ui/button";

export function ImportTransactionsForm({ connectionId }: { connectionId: string }) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "negative" | "positive" } | null>(
    null,
  );

  const days = daysBetween(startDate, endDate);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!startDate || !endDate) {
      setMessage({ text: "Choose a start and end date.", tone: "negative" });
      return;
    }
    if (endDate < startDate) {
      setMessage({ text: "End date must be on or after the start date.", tone: "negative" });
      return;
    }
    if (days !== null && days > MAX_IMPORT_DAYS) {
      setMessage({
        text: `Choose a range of ${MAX_IMPORT_DAYS} days or fewer (currently ${days}).`,
        tone: "negative",
      });
      return;
    }

    setPending(true);
    try {
      const count = await importBankConnectionRange(connectionId, startDate, endDate);
      setMessage({ text: `Imported ${count} transaction${count === 1 ? "" : "s"}.`, tone: "positive" });
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Import failed.", tone: "negative" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        Import
      </Button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border bg-surface-subtle p-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            From
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            To
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
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

      {message && (
        <p className={`text-xs ${message.tone === "negative" ? "text-negative" : "text-positive"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
