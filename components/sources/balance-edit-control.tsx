"use client";

import { useRef, type KeyboardEvent } from "react";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Button } from "@/components/ui/button";
import { useInlineEdit } from "@/components/ui/inline-edit";
import { Input } from "@/components/ui/input";

type SetBalanceAction = (
  prevState: { error: string } | null,
  formData: FormData,
) => Promise<{ error: string } | null>;

// Toggle-to-inline-input: a plain button that swaps for an autofocused
// input on click, committing on blur/Enter and discarding on Escape.
export function BalanceEditControl({
  action,
  balance,
}: {
  action: SetBalanceAction;
  balance: number;
}) {
  const { editing, setEditing, error, commit, cancel } = useInlineEdit(action);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitIfChanged() {
    const value = inputRef.current?.value ?? "";
    if (value === "" || Number(value) === balance) {
      cancel();
      return;
    }
    const formData = new FormData();
    formData.set("amount", value);
    commit(formData);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    stepAmountByDollar(event);
    if (event.key === "Enter") {
      event.preventDefault();
      commitIfChanged();
    } else if (event.key === "Escape") {
      cancel();
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
      <Input
        uiSize="sm"
        ref={inputRef}
        type="number"
        step="0.01"
        defaultValue={balance}
        autoFocus
        onBlur={commitIfChanged}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-28"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
