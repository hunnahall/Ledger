"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Button } from "@/components/ui/button";

type SetBalanceAction = (
  prevState: { error: string } | null,
  formData: FormData,
) => Promise<{ error: string } | null>;

// Same toggle-to-inline-input pattern as BudgetRenameControl: a plain
// button that swaps for an autofocused input on click, committing on
// blur/Enter and discarding on Escape.
export function BalanceEditControl({
  action,
  balance,
}: {
  action: SetBalanceAction;
  balance: number;
}) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const value = inputRef.current?.value ?? "";
    if (value === "" || Number(value) === balance) {
      setEditing(false);
      setError(null);
      return;
    }
    const formData = new FormData();
    formData.set("amount", value);
    startTransition(async () => {
      const result = await action(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    stepAmountByDollar(event);
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setEditing(false);
      setError(null);
    }
  }

  if (!editing) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="px-2 py-1 text-xs"
        onClick={() => setEditing(true)}
      >
        Edit
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        defaultValue={balance}
        autoFocus
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
