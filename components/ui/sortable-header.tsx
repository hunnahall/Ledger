"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type SortDirection = "desc" | "asc" | null;

// The three-state numeric sort used by the Budget page's "Monthly amount"
// header and the Dashboard's "Spending By Source" card. Both had their own
// verbatim copy of the cycle, the sort and the header button — including the
// same three-branch aria-label and the same chevron rotate/dim classes.
export function useSortDirection<T>(items: T[], value: (item: T) => number) {
  const [direction, setDirection] = useState<SortDirection>(null);

  // none -> high-to-low -> low-to-high -> none, the way a spreadsheet column
  // header behaves.
  const cycle = useCallback(() => {
    setDirection((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null));
  }, []);

  const sorted = useMemo(() => {
    if (direction === null) return items;
    return [...items].sort((a, b) =>
      direction === "desc" ? value(b) - value(a) : value(a) - value(b),
    );
    // `value` is a plain accessor defined inline at each call site, so it
    // would be a new identity every render; the data and direction are what
    // actually decide the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, direction]);

  return { sorted, direction, cycle };
}

export function SortableHeader({
  label,
  direction,
  onClick,
  className,
}: {
  label: string;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-1 hover:text-foreground", className)}
      aria-label={
        direction === "desc"
          ? `Sorted high to low by ${label}, click for low to high`
          : direction === "asc"
            ? `Sorted low to high by ${label}, click to clear sort`
            : `Sort by ${label}`
      }
    >
      {label}
      <ChevronDownIcon
        size={12}
        className={direction === "asc" ? "rotate-180" : direction === null ? "opacity-30" : ""}
      />
    </button>
  );
}
