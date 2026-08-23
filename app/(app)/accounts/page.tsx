import { getAccounts, getBankConnections } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { createManualAccount, deleteManualAccount } from "@/lib/actions/accounts";
import {
  connectBankConnection,
  disconnectBankConnection,
  syncBankConnection,
} from "@/lib/actions/simplefin";
import { ImportTransactionsForm } from "@/components/accounts/import-transactions-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AddIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  manual: "Manual",
};

export default async function AccountsPage() {
  const [accounts, connections, settings] = await Promise.all([
    getAccounts(),
    getBankConnections(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted">Your bank accounts and manual balances.</p>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{account.account_name}</div>
                  {account.institution_name && (
                    <div className="text-xs text-muted">{account.institution_name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {TYPE_LABELS[account.account_type] ?? account.account_type}
                </td>
                <td className="px-4 py-3">
                  <Money amount={account.current_balance} decimalPlaces={decimalPlaces} />
                </td>
                <td className="px-4 py-3 text-muted">{account.status}</td>
                <td className="px-4 py-3 text-right">
                  {account.is_manual && (
                    <form action={deleteManualAccount.bind(null, account.id)}>
                      <Button type="submit" variant="secondary" tone="negative" size="sm" className="px-2 py-1 text-xs">
                        Delete
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="max-w-2xl p-4">
        <form
          action={createManualAccount}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Account name
            <input
              type="text"
              name="account_name"
              required
              placeholder="e.g. Cash, Wallet"
              className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type
            <Select name="account_type" defaultValue="manual" className="w-36">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Starting balance
            <input
              type="number"
              name="current_balance"
              step="0.01"
              defaultValue={0}
              className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <Button type="submit" variant="accent" size="icon" aria-label="Add account">
            <AddIcon />
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <p className="font-medium">Connected banks (SimpleFin)</p>
        <p className="mt-1 text-sm text-muted">
          Each connection can cover multiple accounts. Syncs pull roughly a day of
          overlap each time, so re-syncing is always safe. Use Import to backfill a
          specific date range (up to 90 days at a time) — re-importing an overlapping
          range is also safe and won&apos;t create duplicates.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {connection.accounts.length > 0
                      ? connection.accounts.map((a) => a.account_name).join(", ")
                      : "No accounts yet"}
                  </span>
                  <Badge className={connection.status === "error" ? "text-negative" : undefined}>
                    {connection.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  {connection.last_synced_at
                    ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}`
                    : "Never synced"}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <form action={syncBankConnection.bind(null, connection.id)}>
                  <Button type="submit" variant="secondary" size="sm">
                    Sync now
                  </Button>
                </form>
                <ImportTransactionsForm connectionId={connection.id} />
                <form action={disconnectBankConnection.bind(null, connection.id)}>
                  <Button type="submit" variant="secondary" tone="negative" size="sm">
                    Disconnect
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <form
          action={connectBankConnection}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
        >
          <label className="flex flex-1 min-w-64 flex-col gap-1 text-sm">
            SimpleFin setup token
            <input
              type="text"
              name="setup_token"
              required
              placeholder="Paste the setup token from your SimpleFin Bridge account"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <Button type="submit" variant="accent">
            Connect
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Get a setup token from{" "}
          <a
            href="https://beta-bridge.simplefin.org/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            your SimpleFin Bridge account
          </a>
          . It can only be claimed once.
        </p>
      </Card>
    </div>
  );
}
