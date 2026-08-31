"use client";

import { useState } from "react";
import Link from "next/link";
import { useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ChevronDownIcon } from "@/components/ui/icons";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";

type SortDirection = "desc" | "asc" | null;

// How much moved out of each Source this month (the old Source Balances +
// Funds cards merged into one list, now showing spend instead of running
// balance), sortable by amount — same none -> high-to-low -> low-to-high
// three-state cycle as CategoriesTable's "Monthly amount" header on the
// Budget page.
export function SpendingBySourceCard({
  spending,
  decimalPlaces,
}: {
  spending: { id: string; name: string; spent: number }[];
  decimalPlaces: number;
}) {
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { open, modal } = useModal();

  function cycleSortDirection() {
    setSortDirection((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null));
  }

  const sortedSpending =
    sortDirection === null
      ? spending
      : [...spending].sort((a, b) =>
          sortDirection === "desc" ? b.spent - a.spent : a.spent - b.spent,
        );

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">Spending By Source</p>
        <button
          type="button"
          onClick={cycleSortDirection}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          aria-label={
            sortDirection === "desc"
              ? "Sorted high to low, click for low to high"
              : sortDirection === "asc"
                ? "Sorted low to high, click to clear sort"
                : "Sort by amount"
          }
        >
          Amount
          <ChevronDownIcon
            size={12}
            className={sortDirection === "asc" ? "rotate-180" : sortDirection === null ? "opacity-30" : ""}
          />
        </button>
      </div>
      <div className="flex flex-col divide-y divide-border text-sm">
        {sortedSpending.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex w-full justify-between py-2 text-left first:pt-0 last:pb-0"
            onClick={() =>
              open(
                <TransactionsPopupList
                  title={s.name}
                  kind={{ type: "source", sourceId: s.id }}
                  decimalPlaces={decimalPlaces}
                />,
              )
            }
          >
            <span>{s.name}</span>
            <span>
              <Money amount={s.spent} decimalPlaces={decimalPlaces} />
            </span>
          </button>
        ))}
        {spending.length === 0 && (
          <p className="text-muted">
            No sources yet.{" "}
            <Link href="/sources" className="underline">
              Add one
            </Link>
            .
          </p>
        )}
      </div>
      {modal}
    </Card>
  );
}
