"use client";

import { archiveFund, setFundBalance } from "@/lib/actions/sources";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { BalanceEditControl } from "@/components/sources/balance-edit-control";

// Driven by the fund-type Source (not the funds table directly) — a Source
// stays visible here as long as it's active, even if its linked Fund row
// was archived independently of it (see getSourcesWithBalance).
export function FundCard({
  fundId,
  name,
  balance,
  decimalPlaces,
}: {
  fundId: string | null;
  name: string;
  balance: number;
  decimalPlaces: number;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{name}</p>
          <Badge>Fund</Badge>
          <p className={`text-lg font-semibold ${balance < 0 ? "text-negative" : ""}`}>
            <Money amount={balance} decimalPlaces={decimalPlaces} />
          </p>
        </div>
        {fundId && (
          <div className="flex items-center gap-2">
            <BalanceEditControl action={setFundBalance.bind(null, fundId)} balance={balance} />
            <ActionButtonForm
              action={archiveFund.bind(null, fundId)}
              variant="secondary"
              tone="negative"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              Archive
            </ActionButtonForm>
          </div>
        )}
      </div>

      {!fundId && (
        <p className="border-t border-border pt-3 text-xs text-negative">
          This Source has no linked Fund record — balance can&apos;t be adjusted here.
        </p>
      )}
    </Card>
  );
}
