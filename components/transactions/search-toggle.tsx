"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { useSetSearchParams } from "./column-filter";

export function SearchToggle() {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const currentSearch = searchParams.get("search") ?? "";
  const [open, setOpen] = useState(Boolean(currentSearch));
  const [value, setValue] = useState(currentSearch);

  // Keep the field in sync when the URL's search param changes from outside
  // this component (e.g. cleared elsewhere) — adjusted during render rather
  // than in an effect (React's recommended pattern for this).
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setValue(currentSearch);
    if (currentSearch) setOpen(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search transactions"
        className="flex items-center justify-center rounded-md p-2 text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-foreground"
      >
        <SearchIcon />
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        setParams({ search: value || null });
      }}
    >
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
        placeholder="Search description…"
        className="w-44 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            setParams({ search: null });
            setOpen(false);
          }}
          aria-label="Clear search"
          className="rounded-md p-2 text-muted hover:text-foreground"
        >
          ×
        </button>
      )}
    </form>
  );
}
