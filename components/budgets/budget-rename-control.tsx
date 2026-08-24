"use client";

import { useState, useRef, useTransition, type KeyboardEvent } from "react";
import { renameBudget } from "@/lib/actions/budgets";
import { Button } from "@/components/ui/button";

export function BudgetRenameControl({ budgetId, name }: { budgetId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value || value === name) {
      setEditing(false);
      return;
    }
    const formData = new FormData();
    formData.set("name", value);
    startTransition(async () => {
      const result = await renameBudget(budgetId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
        Rename
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        defaultValue={name}
        autoFocus
        disabled={pending}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-48 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
