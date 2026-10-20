"use client";

import { syncAllBankConnections } from "@/lib/actions/simplefin";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { RefreshIcon } from "@/components/ui/icons";

// Fans out to every connected bank at once. Each bank's own Sync button is
// on the Accounts page; Transactions has no single connection to scope to.
export function SyncButton() {
  return (
    <ActionButtonForm action={syncAllBankConnections} pendingLabel="Syncing">
      <RefreshIcon size={16} />
      Sync
    </ActionButtonForm>
  );
}
