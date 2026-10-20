import { getSettings } from "@/lib/queries/settings";
import { getOptionalUser } from "@/lib/supabase/auth";
import { getBankConnections } from "@/lib/queries/accounts";
import { disconnectBankConnection, syncBankConnection } from "@/lib/actions/simplefin";
import { DecimalPlacesForm } from "@/components/settings/decimal-places-form";
import { BudgetTypeForm } from "@/components/settings/budget-type-form";
import { ImportTransactionsForm } from "@/components/accounts/import-transactions-form";
import { ConnectBankConnectionForm } from "@/components/accounts/connect-bank-connection-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { LocalTimestamp } from "@/components/ui/local-timestamp";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { AccountCard } from "@/components/settings/account-card";

export default async function SettingsPage() {
  const [settings, connections, { user }] = await Promise.all([
    getSettings(),
    getBankConnections(),
    getOptionalUser(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Settings</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <Card className="min-w-56 flex-1 p-5">
          <DecimalPlacesForm decimalPlaces={settings.decimal_places} />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <p className="text-sm font-medium">Appearance</p>
          <ThemeToggle className="mt-3" />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <BudgetTypeForm budgetType={settings.budget_type} />
        </Card>

        <Card className="min-w-56 flex-1 p-5">
          <TimezoneForm timezone={settings.timezone} />
        </Card>
      </div>

      <Card className="p-5">
        <p className="font-medium">Connected banks (SimpleFin)</p>
        <p className="mt-1 text-sm text-muted">
          Connections can cover multiple accounts. Re-syncing or importing transactions is
          always safe.
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
                  {connection.last_synced_at ? (
                    <>
                      Last synced <LocalTimestamp iso={connection.last_synced_at} />
                    </>
                  ) : (
                    "Never synced"
                  )}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ActionButtonForm
                  action={syncBankConnection.bind(null, connection.id)}
                  variant="secondary"
                  size="sm"
                >
                  Sync now
                </ActionButtonForm>
                <ImportTransactionsForm connectionId={connection.id} />
                <ActionButtonForm
                  action={disconnectBankConnection.bind(null, connection.id)}
                  variant="secondary"
                  tone="negative"
                  size="sm"
                >
                  Disconnect
                </ActionButtonForm>
              </div>
            </div>
          ))}
        </div>

        <ConnectBankConnectionForm />
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

      {user?.email && <AccountCard email={user.email} />}
    </div>
  );
}
