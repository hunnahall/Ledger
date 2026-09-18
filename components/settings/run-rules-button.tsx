"use client";

import { useActionState } from "react";
import { runVendorRulesNow } from "@/lib/actions/vendor-rules";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@/components/ui/icons";

export function RunRulesButton() {
  const [state, formAction, isPending] = useActionState(runVendorRulesNow, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? <SpinnerIcon className="animate-spin" /> : null}
        Run rules now
      </Button>
      {state?.error ? (
        <p className="text-xs text-negative">{state.error}</p>
      ) : state ? (
        <p className="text-xs text-muted">
          {state.count === 0
            ? "No matching transactions found."
            : `Categorized ${state.count} transaction${state.count === 1 ? "" : "s"}.`}
        </p>
      ) : null}
    </form>
  );
}
