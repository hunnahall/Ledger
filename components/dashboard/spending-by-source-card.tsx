"use client";

import Link from "next/link";
import { useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { SortableHeader, useSortDirection } from "@/components/ui/sortable-header";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";

// How much moved out of each Source this month (the old Source Balances +
// Funds cards merged into one list, now showing spend instead of running
// balance), sortable by amount — same none -> high-to-low -> low-to-high
// three-state cycle as CategoriesTable's "Monthly amount" header on the
// Budget page.
export function SpendingBySourceCard({
  spending,
  decimalPlaces,
  monthISO,
}: {
  spending: { id: string; name: string; spent: number }[];
  decimalPlaces: number;
  monthISO: string;
}) {
  const { open, modal } = useModal();
  const {
    sorted: sortedSpending,
    direction: sortDirection,
    cycle: cycleSortDirection,
  } = useSortDirection(spending, (s) => s.spent);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">Spending By Source</p>
        <SortableHeader
          label="Amount"
          direction={sortDirection}
          onClick={cycleSortDirection}
          className="text-xs text-muted"
        />
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
                  monthISO={monthISO}
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
