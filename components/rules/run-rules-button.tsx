"use client";

import { useActionState } from "react";
import { runRulesNow } from "@/lib/actions/rules";
import { Button } from "@/components/ui/button";

export function RunRulesButton() {
  const [state, formAction, isPending] = useActionState(runRulesNow, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Running" : "Run rules now"}
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
