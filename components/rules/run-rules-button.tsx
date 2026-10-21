"use client";

import { useActionState } from "react";
import { runRulesNow } from "@/lib/actions/rules";
import { Button } from "@/components/ui/button";

export function RunRulesButton() {
  const [state, formAction, isPending] = useActionState(runRulesNow, null);

  return (
    <form action={formAction} className="relative">
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Running" : "Run rules now"}
      </Button>
      {state?.error ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-danger">{state.error}</p>
      ) : state ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-muted">
          {state.count === 0
            ? "No matching transactions found."
            : `Categorized ${state.count} transaction${state.count === 1 ? "" : "s"}.`}
        </p>
      ) : null}
    </form>
  );
}
