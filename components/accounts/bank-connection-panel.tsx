"use client";

import { useState, useTransition, type ReactNode } from "react";
import { disconnectBankConnection, syncBankConnection } from "@/lib/actions/simplefin";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocalTimestamp } from "@/components/ui/local-timestamp";
import { RowMenu } from "@/components/ui/row-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useModal } from "@/components/ui/modal";
import { ImportTransactionsForm } from "@/components/accounts/import-transactions-form";

const STATUS: Record<string, { tone: "success" | "warning" | "danger"; label: string }> = {
  active: { tone: "success", label: "Connected" },
  error: { tone: "danger", label: "Sync error" },
  disconnected: { tone: "warning", label: "Disconnected" },
};

// One SimpleFin connection: its bank, status and last sync, the Sync and
// Import buttons, Disconnect in the ⋯ menu, and its accounts as rows.
export function BankConnectionPanel({
  connection,
  bankName,
  children,
}: {
  connection: { id: string; status: string; last_synced_at: string | null };
  bankName: string;
  children: ReactNode;
}) {
  const { open, close, modal } = useModal();
  const { confirm, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const status = STATUS[connection.status] ?? STATUS.active;

  async function handleDisconnect() {
    const ok = await confirm(
      `Disconnect ${bankName}? Its accounts and transactions stay, and no Source balance changes, but nothing new syncs. Connecting it again with a new setup token picks the same accounts back up.`,
      { confirmLabel: "Disconnect", destructive: true },
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await disconnectBankConnection(connection.id, null, new FormData());
      setError(result?.error ?? null);
    });
  }

  return (
    <Card
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="truncate text-sm font-semibold">{bankName}</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="font-mono text-xs text-muted">
            {connection.last_synced_at ? (
              <>
                Synced <LocalTimestamp iso={connection.last_synced_at} relative />
              </>
            ) : (
              "Never synced"
            )}
          </span>
        </div>
      }
      action={
        <>
          <ActionButtonForm action={syncBankConnection.bind(null, connection.id)} size="sm" pendingLabel="Syncing">
            Sync
          </ActionButtonForm>
          <Button
            type="button"
            size="sm"
            onClick={() => open(<ImportTransactionsForm connectionId={connection.id} onDone={close} />)}
          >
            Import
          </Button>
          <RowMenu
            label={`More actions for ${bankName}`}
            items={[{ label: "Disconnect", onSelect: handleDisconnect, destructive: true }]}
          />
        </>
      }
    >
      {children}
      {error && <p className="px-5 py-2 text-xs text-danger">{error}</p>}
      {modal}
      {dialog}
    </Card>
  );
}
