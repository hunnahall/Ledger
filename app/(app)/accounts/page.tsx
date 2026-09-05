import { getAccounts } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { deleteManualAccount } from "@/lib/actions/accounts";
import { CreateManualAccountForm } from "@/components/accounts/create-manual-account-form";
import { Card } from "@/components/ui/card";
import { ActionButtonForm } from "@/components/ui/action-button-form";
import { Money } from "@/components/ui/money";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/accounts/types";


export default async function AccountsPage() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
      </div>

      <Card className="p-0">
        {/* Below md this stacks into a card per account instead of a table
            row — at full table width, Status and the Delete button would
            otherwise only be reachable by scrolling sideways. */}
        <div className="hidden items-center gap-3 border-b border-border px-4 py-3 text-left text-xs text-muted md:flex">
          <span className="flex-1 font-medium">Account</span>
          <span className="w-28 shrink-0 font-medium">Type</span>
          <span className="w-28 shrink-0 font-medium">Balance</span>
          <span className="w-24 shrink-0 font-medium">Status</span>
          <span className="w-20 shrink-0"></span>
        </div>
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex flex-col gap-2 border-b border-border p-4 last:border-0 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3"
          >
            <div className="md:flex-1">
              <div className="font-medium">{account.account_name}</div>
              {account.institution_name && (
                <div className="text-xs text-muted">{account.institution_name}</div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted md:contents">
              <span className="md:w-28 md:shrink-0">
                {TYPE_LABELS[account.account_type] ?? account.account_type}
              </span>
              <Money amount={account.current_balance} decimalPlaces={decimalPlaces} className="text-foreground md:w-28 md:shrink-0" />
            </div>
            <div className="flex items-center justify-between text-sm md:contents">
              <span className="text-muted md:w-24 md:shrink-0">{account.status}</span>
              <span className="md:w-20 md:shrink-0 md:text-right">
                {account.is_manual && (
                  <ActionButtonForm
                    action={deleteManualAccount.bind(null, account.id)}
                    variant="secondary"
                    tone="negative"
                    size="sm"
                    className="px-2 py-1 text-xs"
                    errorClassName="mt-1 text-right text-xs text-negative"
                  >
                    Delete
                  </ActionButtonForm>
                )}
              </span>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="px-4 py-6 text-center text-muted">No accounts yet.</p>
        )}
      </Card>

      <CreateManualAccountForm />
    </div>
  );
}
