"use client";

import { useRef, useState, useTransition } from "react";
import { updateCategory, deleteCategory } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { SpinnerIcon } from "@/components/ui/icons";

// Toggle-to-inline-edit, same pattern as VendorRuleRow/BalanceEditControl —
// only a name to rename here, no monthly_amount (Excluded Categories never
// carry one).
export function ExcludedCategoryRow({
  category,
  budgetId,
}: {
  category: { id: string; name: string };
  budgetId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function commit() {
    const formData = new FormData();
    formData.set("name", nameRef.current?.value ?? "");
    startTransition(async () => {
      const result = await updateCategory(category.id, budgetId, null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <input
          ref={nameRef}
          type="text"
          defaultValue={category.name}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={commit}
          disabled={isPending}
        >
          {isPending ? <SpinnerIcon className="animate-spin" /> : null}
          Save
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        {error && <p className="w-full text-xs text-negative">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <span className="font-medium">{category.name}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="px-2 py-1 text-xs"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <ActionButtonForm action={deleteCategory.bind(null, category.id, budgetId)} size="sm" tone="negative">
          Delete
        </ActionButtonForm>
      </div>
    </li>
  );
}
