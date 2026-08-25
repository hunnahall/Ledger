"use client";

import { useActionState } from "react";
import { createCategory } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";

export function CreateExcludedCategoryForm({ budgetId }: { budgetId: string }) {
  const [state, formAction] = useActionState(createCategory.bind(null, budgetId, true), null);

  return (
    <form
      action={formAction}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-muted">
        New excluded category
        <input
          type="text"
          name="name"
          required
          placeholder="e.g. Work"
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>
      <Button type="submit" variant="accent" size="sm">
        Add
      </Button>
      {state?.error && <p className="w-full text-xs text-negative">{state.error}</p>}
    </form>
  );
}
