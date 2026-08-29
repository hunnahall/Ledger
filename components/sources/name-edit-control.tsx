"use client";

import { useRef, type KeyboardEvent } from "react";
import { useInlineEdit } from "@/components/ui/inline-edit";

type RenameAction = (
  prevState: { error: string } | null,
  formData: FormData,
) => Promise<{ error: string } | null>;

// Toggle-to-inline-input, same pattern as BalanceEditControl: a plain
// button that swaps for an autofocused text input on click, committing on
// blur/Enter and discarding on Escape.
export function NameEditControl({ action, name }: { action: RenameAction; name: string }) {
  const { editing, setEditing, error, commit, cancel } = useInlineEdit(action);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitIfChanged() {
    const value = inputRef.current?.value.trim() ?? "";
    if (value === "" || value === name) {
      cancel();
      return;
    }
    const formData = new FormData();
    formData.set("name", value);
    commit(formData);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitIfChanged();
    } else if (event.key === "Escape") {
      cancel();
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded px-1 -mx-1 font-medium hover:bg-background"
        aria-label={`Rename ${name}`}
      >
        {name}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        defaultValue={name}
        autoFocus
        onBlur={commitIfChanged}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-40 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
