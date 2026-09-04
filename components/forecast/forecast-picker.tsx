"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createForecast, deleteForecast } from "@/lib/actions/forecasts";
import { formatDate } from "@/lib/format";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

type SavedForecast = { id: string; name: string; sourceName: string; updatedAt: string };
type SourceOption = { id: string; name: string };

// Landing state for /forecast (no forecast open yet): a list of saved
// forecasts to reopen, or start a new one. There's no other "reopen a
// saved item" list anywhere else in the app to model this after, so it's a
// plain bordered list rather than a table — each row needs its own delete
// affordance, which doesn't fit TableShell's column model cleanly.
export function ForecastPicker({
  forecasts,
  sourceOptions,
}: {
  forecasts: SavedForecast[];
  sourceOptions: SourceOption[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [createState, createAction] = useActionState(createForecast, null);
  const { confirm, dialog } = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (createState && "id" in createState && createState.id) {
      router.push(`/forecast?id=${createState.id}`);
    }
  }, [createState, router]);

  async function handleDelete(id: string, name: string) {
    const ok = await confirm(`Delete the "${name}" forecast?`);
    if (!ok) return;
    setDeletingId(id);
    startDeleteTransition(async () => {
      await deleteForecast(id, null, new FormData());
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {dialog}
      <div className="rounded-lg border border-border bg-surface">
        {forecasts.length === 0 && !showCreate && (
          <p className="p-5 text-sm text-muted">No saved forecasts yet.</p>
        )}
        {forecasts.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <a href={`/forecast?id=${f.id}`} className="min-w-0 flex-1">
              <p className="font-medium">{f.name}</p>
              <p className="text-xs text-muted">
                {f.sourceName} &middot; updated {formatDate(f.updatedAt.slice(0, 10))}
              </p>
            </a>
            <Button
              type="button"
              variant="secondary"
              tone="negative"
              size="sm"
              disabled={deletingId === f.id}
              onClick={() => handleDelete(f.id, f.name)}
            >
              Delete
            </Button>
          </div>
        ))}

        {showCreate && (
          <form action={createAction} className="flex flex-wrap items-end gap-3 border-t border-border p-4">
            <label className="flex flex-col gap-1 text-sm">
              Name
              <Input
                type="text"
                name="name"
                required
                placeholder="e.g. Travel"
                className="w-40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Source
              <Select name="source_id" uiSize="sm" className="w-40" required>
                {sourceOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="accent" size="sm">
              Create
            </Button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="pb-2 text-xs text-muted hover:underline"
            >
              Cancel
            </button>
            {createState?.error && <p className="w-full text-xs text-negative">{createState.error}</p>}
          </form>
        )}
      </div>

      {!showCreate && (
        <Button
          type="button"
          variant="accent"
          size="sm"
          className="w-fit"
          onClick={() => setShowCreate(true)}
        >
          <AddIcon size={14} /> New Forecast
        </Button>
      )}
    </div>
  );
}
