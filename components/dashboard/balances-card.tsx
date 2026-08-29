"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ChevronDownIcon } from "@/components/ui/icons";

type SortDirection = "desc" | "asc" | null;

// Every Source's balance (the old Source Balances + Funds cards merged
// into one list), sortable by amount — same none -> high-to-low ->
// low-to-high three-state cycle as CategoriesTable's "Monthly amount"
// header on the Budget page.
export function BalancesCard({
  balances,
  decimalPlaces,
}: {
  balances: { id: string; name: string; balance: number }[];
  decimalPlaces: number;
}) {
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  function cycleSortDirection() {
    setSortDirection((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null));
  }

  const sortedBalances =
    sortDirection === null
      ? balances
      : [...balances].sort((a, b) =>
          sortDirection === "desc" ? b.balance - a.balance : a.balance - b.balance,
        );

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">Balances</p>
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
      <div className="flex flex-col gap-2 text-sm">
        {sortedBalances.map((b) => (
          <div key={b.id} className="flex justify-between">
            <span>{b.name}</span>
            <span className={b.balance < 0 ? "text-negative" : ""}>
              <Money amount={b.balance} decimalPlaces={decimalPlaces} />
            </span>
          </div>
        ))}
        {balances.length === 0 && (
          <p className="text-muted">
            No sources yet.{" "}
            <Link href="/sources" className="underline">
              Add one
            </Link>
            .
          </p>
        )}
      </div>
    </Card>
  );
}
