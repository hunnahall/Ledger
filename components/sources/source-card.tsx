"use client";

import type { getSourcesWithBalance } from "@/lib/queries/sources";
import { archiveSource, adjustSourceBalance, setSourceBalance } from "@/lib/actions/sources";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { BalanceAdjustForm } from "@/components/sources/balance-adjust-form";

const TYPE_LABELS: Record<string, string> = {
  budget: "Budget",
  past_payment: "Past payment",
  future_repayment: "Future repayment",
};

// Fund-type sources never reach this card — they render as a single merged
// FundCard instead (a Fund is a Fund regardless of how its balance moves;
// see the Funds section on the Sources page), so every source rendered here
// keeps its own manual balance controls unconditionally.
export function SourceCard({
  source,
  decimalPlaces,
}: {
  source: Awaited<ReturnType<typeof getSourcesWithBalance>>[number];
  decimalPlaces: number;
}) {
  return (
    <Card key={source.id} className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{source.name}</p>
          <Badge>{TYPE_LABELS[source.type] ?? source.type}</Badge>
          {(source.type === "past_payment" || source.type === "future_repayment") &&
            source.deposit_date && (
              <Badge>
                {source.type === "past_payment" ? "Deposited" : "Expected"}{" "}
                {formatDate(source.deposit_date)}
              </Badge>
            )}
          <p className={`text-lg font-semibold ${source.balance < 0 ? "text-negative" : ""}`}>
            <Money amount={source.balance} decimalPlaces={decimalPlaces} />
          </p>
        </div>
        <ActionButtonForm
          action={archiveSource.bind(null, source.id)}
          variant="secondary"
          tone="negative"
          size="sm"
          className="px-2 py-1 text-xs"
        >
          Archive
        </ActionButtonForm>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
        <BalanceAdjustForm
          action={adjustSourceBalance.bind(null, source.id)}
          label="Adjust balance by"
          placeholder="-500"
        />
        <BalanceAdjustForm
          action={setSourceBalance.bind(null, source.id)}
          label="Adjust balance to"
          placeholder="e.g. 1000"
        />
      </div>
    </Card>
  );
}
