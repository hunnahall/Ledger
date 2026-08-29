"use client";

import { useState, useTransition } from "react";
import type { getSourcesWithBalance } from "@/lib/queries/sources";
import { archiveSource, deleteSource, renameSource, setSourceBalance } from "@/lib/actions/sources";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { BalanceEditControl } from "@/components/sources/balance-edit-control";
import { NameEditControl } from "@/components/sources/name-edit-control";

const TYPE_LABELS: Record<string, string> = {
  budget: "Budget",
  float: "Float",
  sinking_fund: "Sinking Fund",
  income: "Income",
  reimbursement: "Reimbursement",
  fund: "Fund",
};

export function SourceCard({
  source,
  decimalPlaces,
}: {
  source: Awaited<ReturnType<typeof getSourcesWithBalance>>[number];
  decimalPlaces: number;
}) {
  const { confirm, dialog } = useConfirm();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm(`Delete "${source.name}"? This can't be undone.`);
    if (!ok) return;
    startDeleteTransition(async () => {
      const result = await deleteSource(source.id, null, new FormData());
      setDeleteError(result?.error ?? null);
    });
  }

  return (
    <Card key={source.id} className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <NameEditControl action={renameSource.bind(null, source.id)} name={source.name} />
          <Badge>{TYPE_LABELS[source.type] ?? source.type}</Badge>
          {source.type === "reimbursement" && source.deposit_date && (
            <Badge>Deposit date {formatDate(source.deposit_date)}</Badge>
          )}
          <p className={`text-lg font-semibold ${source.balance < 0 ? "text-negative" : ""}`}>
            <Money amount={source.balance} decimalPlaces={decimalPlaces} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BalanceEditControl action={setSourceBalance.bind(null, source.id)} balance={source.balance} />
          {!source.is_system && (
            <>
              <ActionButtonForm
                action={archiveSource.bind(null, source.id)}
                variant="secondary"
                tone="negative"
                size="sm"
                className="px-2 py-1 text-xs"
              >
                Archive
              </ActionButtonForm>
              <Button
                type="button"
                variant="secondary"
                tone="negative"
                size="sm"
                className="px-2 py-1 text-xs"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
      {deleteError && <p className="text-xs text-negative">{deleteError}</p>}
      {dialog}
    </Card>
  );
}
