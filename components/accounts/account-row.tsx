"use client";

import { useState, useTransition } from "react";
import { deleteAccount, setAccountType, setIncludeInCash } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/accounts/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Tag } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";

// Synced accounts pick from these; "Manual" stays for manual accounts only.
const SYNCED_TYPES = ["checking", "savings", "credit_card"];

type AccountRowData = {
  id: string;
  account_name: string;
  account_type: string;
  last4: string | null;
  current_balance: number;
  is_manual: boolean;
  include_in_cash: boolean;
  bank_connection_id: string | null;
};

type RecentTransaction = { id: string; posted_date: string; description: string; amount: number };

// One account inside its bank's (or the manual) panel: name, type tag,
// last 4 and balance, opening to its latest transactions and its type.
export function AccountRow({
  account,
  transactions,
  decimalPlaces,
}: {
  account: AccountRowData;
  transactions: RecentTransaction[];
  decimalPlaces: number;
}) {
  const [typeError, setTypeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const types = account.is_manual ? Object.keys(TYPE_LABELS) : SYNCED_TYPES;
  const { confirm, dialog } = useConfirm();
  // A manual account, or a bank account whose bank was disconnected. One
  // still syncing goes away by disconnecting its bank.
  const deletable = account.is_manual || account.bank_connection_id === null;

  async function handleDelete() {
    const ok = await confirm(
      `Delete ${account.account_name}? Its transactions stay, with no account, and no Source balance changes.`,
      { confirmLabel: "Delete", destructive: true },
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteAccount(account.id, null, new FormData());
      setTypeError(result?.error ?? null);
    });
  }

  function changeType(next: string) {
    startTransition(async () => {
      const result = await setAccountType(account.id, next);
      setTypeError(result?.error ?? null);
    });
  }

  function changeIncludeInCash(next: boolean) {
    startTransition(async () => {
      const result = await setIncludeInCash(account.id, next);
      setTypeError(result?.error ?? null);
    });
  }

  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-5 py-2 transition-colors duration-[120ms] ease-standard hover:bg-fill-hover [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon
          size={16}
          className="shrink-0 -rotate-90 text-muted transition-transform duration-[200ms] group-open:rotate-0"
        />
        <span className="min-w-0 flex-1 truncate font-medium">{account.account_name}</span>
        {!account.include_in_cash && (
          <Tag className="hidden sm:inline-flex" title="Not counted as cash">
            Not cash
          </Tag>
        )}
        <Tag className="hidden sm:inline-flex">{TYPE_LABELS[account.account_type] ?? account.account_type}</Tag>
        {account.last4 && (
          <span className="hidden w-12 font-mono text-xs text-muted sm:inline">··{account.last4}</span>
        )}
        <Money
          amount={account.current_balance}
          decimalPlaces={decimalPlaces}
          symbol={false}
          className="w-28 shrink-0 text-right"
        />
      </summary>

      <div className="border-t border-border bg-surface-subtle">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted">Type</span>
            <Select
              uiSize="sm"
              className="w-36"
              value={account.account_type}
              onChange={changeType}
              disabled={isPending}
            >
              {types.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2" title="Counted in Cash and in Safe to Spend on the Dashboard">
            <input
              type="checkbox"
              checked={account.include_in_cash}
              disabled={isPending}
              onChange={(e) => changeIncludeInCash(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Count as cash
          </label>
          {deletable && (
            <div className="ml-auto">
              <Button type="button" tone="negative" size="sm" disabled={isPending} onClick={handleDelete}>
                Delete account
              </Button>
            </div>
          )}
          {typeError && <p className="w-full text-xs text-danger">{typeError}</p>}
        </div>
        {transactions.length === 0 ? (
          <p className="border-t border-border px-5 py-3 text-sm text-muted">No transactions yet.</p>
        ) : (
          <ul className="border-t border-border">
            {transactions.map((txn) => (
              <li
                key={txn.id}
                className="flex h-9 items-center gap-4 border-b border-border px-5 text-[13px] last:border-0"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{formatDate(txn.posted_date)}</span>
                <span className="min-w-0 flex-1 truncate">{txn.description}</span>
                <Money amount={txn.amount} decimalPlaces={decimalPlaces} symbol={false} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialog}
    </details>
  );
}
