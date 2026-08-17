import { getAccounts } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { createManualAccount, deleteManualAccount } from "@/lib/actions/accounts";
import { formatMoney } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  manual: "Manual",
};

export default async function AccountsPage() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted">Your bank accounts and manual balances.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
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
                  {formatMoney(account.current_balance, decimalPlaces)}
                </td>
                <td className="px-4 py-3 text-muted">{account.status}</td>
                <td className="px-4 py-3 text-right">
                  {account.is_manual && (
                    <form action={deleteManualAccount.bind(null, account.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-border px-2 py-1 text-xs text-negative hover:bg-background"
                      >
                        Delete
                      </button>
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
      </div>

      <form
        action={createManualAccount}
        className="flex max-w-2xl flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
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
          <select
            name="account_type"
            defaultValue="manual"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
        <button
          type="submit"
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
        >
          Add manual account
        </button>
      </form>

      <div className="rounded-lg border border-dashed border-border bg-surface p-5">
        <p className="font-medium">Connect a bank account</p>
        <p className="mt-1 text-sm text-muted">
          Bank sync via Teller isn&apos;t configured yet &mdash; it needs a Teller
          application (client certificate + application ID) set up first.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 cursor-not-allowed rounded-md border border-border px-3 py-2 text-sm text-muted"
        >
          Connect with Teller
        </button>
      </div>
    </div>
  );
}
