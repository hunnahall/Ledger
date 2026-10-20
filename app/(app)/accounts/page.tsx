import { getAccounts, getRecentTransactionsByAccount } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { deleteManualAccount } from "@/lib/actions/accounts";
import { CreateManualAccountForm } from "@/components/accounts/create-manual-account-form";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { LocalTimestamp } from "@/components/ui/local-timestamp";
import { ChevronDownIcon } from "@/components/ui/icons";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/accounts/types";
import { formatDate } from "@/lib/format";

export default async function AccountsPage() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);
  const recent = await getRecentTransactionsByAccount(accounts.map((a) => a.id));
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Accounts</h1>
        <p className="mt-1 text-sm text-muted">Open an account to see its latest transactions.</p>
      </div>

      <div className="flex flex-col gap-2">
        {accounts.map((account) => {
          const syncedAt = (account.bank_connections as { last_synced_at: string | null } | null)
            ?.last_synced_at;
          const transactions = recent.get(account.id) ?? [];
          return (
            <details key={account.id} className="group border border-border bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <ChevronDownIcon
                  size={16}
                  className="shrink-0 -rotate-90 text-muted transition-transform duration-[200ms] group-open:rotate-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{account.account_name}</div>
                  <div className="truncate text-xs text-muted">
                    {[account.institution_name, TYPE_LABELS[account.account_type] ?? account.account_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="text-xs text-muted">
                  {account.is_manual ? (
                    "Manual account"
                  ) : syncedAt ? (
                    <>
                      Synced <LocalTimestamp iso={syncedAt} />
                    </>
                  ) : (
                    "Never synced"
                  )}
                </div>
                <Money
                  amount={account.current_balance}
                  decimalPlaces={decimalPlaces}
                  className="w-28 text-right text-foreground"
                />
              </summary>

              <div className="border-t border-border">
                {transactions.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted">No transactions yet.</p>
                ) : (
                  <ul>
                    {transactions.map((txn) => (
                      <li
                        key={txn.id}
                        className="flex items-center gap-4 border-b border-border px-4 py-2 text-[13px] last:border-0"
                      >
                        <span className="w-28 shrink-0 font-mono text-xs text-muted">
                          {formatDate(txn.posted_date)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{txn.description}</span>
                        <Money
                          amount={txn.amount}
                          decimalPlaces={decimalPlaces}
                          className="shrink-0"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {account.is_manual && (
                  <div className="border-t border-border px-4 py-3">
                    <ActionButtonForm
                      action={deleteManualAccount.bind(null, account.id)}
                      variant="secondary"
                      tone="negative"
                      size="sm"
                      errorClassName="mt-1 text-xs text-negative"
                    >
                      Delete account
                    </ActionButtonForm>
                  </div>
                )}
              </div>
            </details>
          );
        })}
        {accounts.length === 0 && (
          <p className="border border-dashed border-border-strong px-4 py-6 text-center text-muted">
            No accounts yet. Connect a bank in Settings or create a manual account below.
          </p>
        )}
      </div>

      <CreateManualAccountForm />
    </div>
  );
}
