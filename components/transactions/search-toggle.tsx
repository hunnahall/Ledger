"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { useSetSearchParams } from "./column-filter";
import { Input } from "@/components/ui/input";

export function SearchToggle() {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const currentSearch = searchParams.get("search") ?? "";
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentSearch);

  // Keep the field in sync when the URL's search param changes from outside
  // this component (e.g. cleared elsewhere) — adjusted during render rather
  // than in an effect (React's recommended pattern for this).
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setValue(currentSearch);
  }

  const commitAndClose = () => {
    setParams({ search: value || null });
    setOpen(false);
  };

  return (
    // The popover is absolutely positioned so opening it never changes this
    // element's footprint in the header row — it used to render inline,
    // which pushed every column to its right over. Closing (blur, submit,
    // or the × button) always collapses back to the plain icon; an active
    // search shows as a dot on the icon instead, matching the other column
    // filters.
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) commitAndClose();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Search transactions"
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-md p-2 text-muted transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 hover:text-foreground"
      >
        <SearchIcon size={24} />
        {currentSearch && (
          <span
            className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-mark"
            aria-hidden="true"
          />
        )}
      </button>
      {open && (
        <form
          className="absolute right-0 top-full z-10 mt-1 flex items-center gap-1 rounded-lg border border-card-border bg-surface p-2 shadow-popover"
          onSubmit={(e) => {
            e.preventDefault();
            commitAndClose();
          }}
        >
          <Input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search…"
            className="w-40"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setParams({ search: null });
              }}
              aria-label="Clear search"
              className="rounded-md p-1 text-muted hover:text-foreground"
            >
              ×
            </button>
          )}
        </form>
      )}
    </div>
  );
}
