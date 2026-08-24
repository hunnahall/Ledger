"use client";

import type { getFunds } from "@/lib/queries/sources";
import { archiveFund, adjustFundBalance, setFundBalance } from "@/lib/actions/sources";
import { Card } from "@/components/ui/card";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { BalanceAdjustForm } from "@/components/sources/balance-adjust-form";

export function FundCard({
  fund,
  decimalPlaces,
}: {
  fund: Awaited<ReturnType<typeof getFunds>>[number];
  decimalPlaces: number;
}) {
  return (
    <Card key={fund.id} className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{fund.name}</p>
          <p
            className={`mt-1 text-lg font-semibold ${fund.balance < 0 ? "text-negative" : ""}`}
          >
            <Money amount={fund.balance} decimalPlaces={decimalPlaces} />
          </p>
        </div>
        <ActionButtonForm
          action={archiveFund.bind(null, fund.id)}
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
          action={adjustFundBalance.bind(null, fund.id)}
          label="Adjust balance by"
          placeholder="-500"
        />
        <BalanceAdjustForm
          action={setFundBalance.bind(null, fund.id)}
          label="Adjust balance to"
          placeholder="e.g. 1000"
        />
      </div>
    </Card>
  );
}
