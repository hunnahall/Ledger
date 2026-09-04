"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

// Shared by every header filter and the search toggle: merges one or more
// key/value updates into the current URL search params and navigates, so
// each column's filter only ever touches its own param(s) and leaves
// whatever else is active (another column's filter, the text search) alone.
export function useSetSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );
}

function closeDetails(el: HTMLElement) {
  el.closest("details")?.removeAttribute("open");
}

// Every param a column filter or the search box can set — kept in one place
// so "Clear filters" resets exactly what those controls touch, no more and
// no less (e.g. it leaves pagination or other unrelated params alone if any
// get added later).
const CLEARABLE_FILTER_KEYS = ["date_from", "date_to", "account_id", "category_id", "source_id", "search"];

// Renders nothing when no filter is active — there's nothing to clear, and
// an always-visible button here would invite clicks that do nothing.
export function ClearFiltersButton({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const active = CLEARABLE_FILTER_KEYS.some((key) => searchParams.get(key));

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => setParams(Object.fromEntries(CLEARABLE_FILTER_KEYS.map((key) => [key, null])))}
      className={className}
    >
      Clear filters
    </button>
  );
}

function FilterSummary({
  label,
  active,
  align = "center",
}: {
  label: string;
  active: boolean;
  align?: "start" | "center";
}) {
  return (
    <summary
      className={`flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden ${
        align === "start" ? "justify-start pl-0.5" : "justify-center"
      }`}
    >
      {label}
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mark" aria-hidden="true" />}
      <ChevronDownIcon size={10} className="shrink-0" />
    </summary>
  );
}

export function SelectColumnFilter({
  label,
  paramKey,
  options,
  className,
}: {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const current = searchParams.get(paramKey) ?? "";

  return (
    <details className={`relative ${className ?? ""}`}>
      <FilterSummary label={label} active={current !== ""} />
      <ul
        role="listbox"
        className="absolute left-0 z-10 mt-1 max-h-64 w-48 overflow-y-auto rounded-lg border border-card-border bg-surface py-1 text-sm normal-case text-foreground shadow-popover"
      >
        <li>
          <button
            type="button"
            onClick={(e) => {
              setParams({ [paramKey]: null });
              closeDetails(e.currentTarget);
            }}
            className={`block w-full px-3 py-1.5 text-left hover:bg-paper-a2 ${current === "" ? "font-medium" : ""}`}
          >
            All
          </button>
        </li>
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              onClick={(e) => {
                setParams({ [paramKey]: o.value });
                closeDetails(e.currentTarget);
              }}
              className={`block w-full truncate px-3 py-1.5 text-left hover:bg-paper-a2 ${current === o.value ? "font-medium" : ""}`}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function DateRangeColumnFilter({ label, className }: { label: string; className?: string }) {
  const searchParams = useSearchParams();
  const setParams = useSetSearchParams();
  const from = searchParams.get("date_from") ?? "";
  const to = searchParams.get("date_to") ?? "";

  return (
    <details className={`relative ${className ?? ""}`}>
      <FilterSummary label={label} active={Boolean(from || to)} align="start" />
      <form
        className="absolute left-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-lg border border-card-border bg-surface p-3 text-xs normal-case text-foreground shadow-popover"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setParams({
            date_from: (data.get("date_from") as string) || null,
            date_to: (data.get("date_to") as string) || null,
          });
          closeDetails(e.currentTarget);
        }}
      >
        <label className="flex flex-col gap-1 text-muted">
          From
          <Input type="date" name="date_from" defaultValue={from} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          To
          <Input type="date" name="date_to" defaultValue={to} />
        </label>
        <div className="flex items-center justify-between">
          <button type="submit" className="rounded-md border border-border px-2 py-1 hover:bg-background">
            Apply
          </button>
          {(from || to) && (
            <button
              type="button"
              onClick={(e) => {
                setParams({ date_from: null, date_to: null });
                closeDetails(e.currentTarget);
              }}
              className="text-muted hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
