"use client";

import { useActionState } from "react";
import { createBudget } from "@/lib/actions/budgets";
import { Button } from "@/components/ui/button";

export function CreateBudgetForm({
  className,
  buttonVariant = "primary",
}: {
  className?: string;
  buttonVariant?: "primary" | "accent" | "secondary";
}) {
  const [state, formAction] = useActionState(createBudget, null);

  return (
    <form action={formAction} className={className}>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        New budget name
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. Normal, Cut food / splurge rent"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <Button type="submit" variant={buttonVariant}>
        Create
      </Button>
      {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
    </form>
  );
}
