import { getAccounts, getBankConnections, getRecentTransactionsByAccount } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { accountTotals } from "@/lib/accounts/totals";
import { formatMoney } from "@/lib/format";
import { AccountRow } from "@/components/accounts/account-row";
import { BankConnectionPanel } from "@/components/accounts/bank-connection-panel";
import { ConnectBankButton } from "@/components/accounts/connect-bank-connection-form";
import { AddManualAccountButton } from "@/components/accounts/create-manual-account-form";
import { Card } from "@/components/ui/card";
import { Stat, StatRow } from "@/components/ui/stat";

export default async function AccountsPage() {
  const [accounts, connections, settings] = await Promise.all([
    getAccounts(),
    getBankConnections(),
    getSettings(),
  ]);
  const recent = await getRecentTransactionsByAccount(accounts.map((a) => a.id));
  const decimalPlaces = settings.decimal_places;
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const totals = accountTotals(accounts);
  const manual = accounts.filter((a) => a.is_manual);

  const rows = (list: typeof accounts) =>
    list.map((account) => (
      <AccountRow
        key={account.id}
        account={account}
        transactions={recent.get(account.id) ?? []}
        decimalPlaces={decimalPlaces}
      />
    ));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Accounts</h1>
          <p className="mt-1 text-sm text-muted">Open an account to see its latest transactions.</p>
        </div>
        <ConnectBankButton />
      </div>

      <StatRow>
        <Stat label="Cash" value={money(totals.cash)} caption="Accounts counted as cash" />
        <Stat label="Credit cards" value={money(totals.credit)} />
        <Stat label="Net" value={money(totals.net)} caption={`${accounts.length} accounts`} />
      </StatRow>

      {connections.map((connection) => {
        const connectionAccounts = accounts.filter((a) => a.bank_connection_id === connection.id);
        const bankName =
          connectionAccounts.find((a) => a.institution_name)?.institution_name ??
          (connectionAccounts.length > 0 ? connectionAccounts[0].account_name : "Bank connection");
        return (
          <BankConnectionPanel key={connection.id} connection={connection} bankName={bankName}>
            {connectionAccounts.length > 0 ? (
              rows(connectionAccounts)
            ) : (
              <p className="px-5 py-4 text-sm text-muted">No accounts yet. Sync to pull them in.</p>
            )}
          </BankConnectionPanel>
        );
      })}

      <Card title="Manual Accounts" action={<AddManualAccountButton />}>
        {manual.length > 0 ? (
          rows(manual)
        ) : (
          <p className="px-5 py-4 text-sm text-muted">
            For money no bank reports, like cash in a wallet.
          </p>
        )}
      </Card>

      {connections.length === 0 && (
        <p className="text-sm text-muted">No banks connected yet. Use Connect bank to add one through SimpleFin.</p>
      )}
    </div>
  );
}
