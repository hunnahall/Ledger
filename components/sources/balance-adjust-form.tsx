"use client";

import { useActionState } from "react";
import { DollarInput } from "@/components/ui/dollar-input";
import { Button } from "@/components/ui/button";

type BalanceAction = (
  prevState: { error: string } | null,
  formData: FormData,
) => Promise<{ error: string } | null>;

export function BalanceAdjustForm({
  action,
  label,
  placeholder,
}: {
  action: BalanceAction;
  label: string;
  placeholder: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {label}
          <DollarInput
            name="amount"
            placeholder={placeholder}
            className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
      </div>
      {state?.error && <p className="text-xs text-negative">{state.error}</p>}
    </form>
  );
}
