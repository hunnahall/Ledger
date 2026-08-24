"use client";

import { useActionState } from "react";
import { updateRetentionDays } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function RetentionForm({ retentionDays }: { retentionDays: number }) {
  const [state, formAction] = useActionState(updateRetentionDays, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Keep transactions and activity log for
        <Select name="retention_days" defaultValue={retentionDays} className="w-full">
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
          <option value={120}>120 days</option>
        </Select>
      </label>
      <p className="text-xs text-muted">
        Transactions and activity log entries older than this are permanently deleted on a
        rolling basis. This can&apos;t be undone.
      </p>
      <Button type="submit" variant="accent" className="w-fit">
        Save
      </Button>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
