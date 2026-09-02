"use client";

import { syncAllBankConnections } from "@/lib/actions/simplefin";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { RefreshIcon } from "@/components/ui/icons";

// Fans out to every connected bank at once — the per-connection "Sync now"
// button lives on the Settings page, but Transactions has no single
// connection to scope to.
export function SyncButton() {
  return (
    <ActionButtonForm action={syncAllBankConnections} variant="accent" size="sm">
      <RefreshIcon size={14} />
      Sync
    </ActionButtonForm>
  );
}
