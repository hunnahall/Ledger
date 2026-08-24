"use client";

import { useActionState } from "react";
import { updateRetentionDays } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function RetentionForm({ retentionDays }: { retentionDays: number }) {
  const [state, formAction] = useActionState(updateRetentionDays, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        Keep transactions and activity log for
        <div className="flex flex-wrap items-end gap-3">
          <Select name="retention_days" defaultValue={retentionDays} className="w-32">
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={120}>120 days</option>
          </Select>
          <Button type="submit" variant="accent" className="w-fit">
            Save
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">Log entries older than this will be permanently deleted.</p>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
