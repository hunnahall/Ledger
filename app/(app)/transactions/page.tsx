import {
  getFilteredTransactions,
  getFilterOptions,
  getTransactionSplits,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import { getAccounts } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import {
  assignTransaction,
  createManualTransaction,
  deleteTransaction,
  saveSplits,
} from "@/lib/actions/transactions";
import { formatMoney } from "@/lib/format";

type SearchParams = {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  category_id?: string;
  source_id?: string;
  uncategorized?: string;
};

function buildQueryString(params: SearchParams) {
  const usp = new URLSearchParams();
  if (params.date_from) usp.set("date_from", params.date_from);
  if (params.date_to) usp.set("date_to", params.date_to);
  if (params.account_id) usp.set("account_id", params.account_id);
  if (params.category_id) usp.set("category_id", params.category_id);
  if (params.source_id) usp.set("source_id", params.source_id);
  if (params.uncategorized) usp.set("uncategorized", params.uncategorized);
  return usp.toString();
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const filters: TransactionFilters = {
    dateFrom: params.date_from,
    dateTo: params.date_to,
    accountId: params.account_id,
    categoryId: params.category_id,
    sourceId: params.source_id,
    uncategorizedOnly: params.uncategorized === "on",
  };

  const [transactions, filterOptions, accounts, settings] = await Promise.all([
    getFilteredTransactions(filters),
    getFilterOptions(),
    getAccounts(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  const splits = await getTransactionSplits(transactions.map((t) => t.id));
  const splitsByTransaction = new Map<string, typeof splits>();
  for (const split of splits) {
    const list = splitsByTransaction.get(split.transaction_id) ?? [];
    list.push(split);
    splitsByTransaction.set(split.transaction_id, list);
  }

  const exportQuery = buildQueryString(params);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-muted">{transactions.length} transactions</p>
        </div>
        <a
          href={`/api/transactions/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
        >
          Export CSV
        </a>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input
            type="date"
            name="date_from"
            defaultValue={params.date_from}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input
            type="date"
            name="date_to"
            defaultValue={params.date_to}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Account
          <select
            name="account_id"
            defaultValue={params.account_id ?? ""}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {filterOptions.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Category
          <select
            name="category_id"
            defaultValue={params.category_id ?? ""}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {filterOptions.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Source
          <select
            name="source_id"
            defaultValue={params.source_id ?? ""}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {filterOptions.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-muted">
          <input
            type="checkbox"
            name="uncategorized"
            defaultChecked={params.uncategorized === "on"}
          />
          Uncategorized only
        </label>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          Filter
        </button>
        <a href="/transactions" className="text-sm text-muted hover:underline">
          Clear
        </a>
      </form>

      <div className="flex flex-col gap-3">
        {transactions.map((txn) => {
          const txnSplits = splitsByTransaction.get(txn.id) ?? [];
          return (
            <div
              key={`${txn.id}-${txn.updated_at}`}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <form
                action={assignTransaction.bind(null, txn.id)}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="w-24 text-sm text-muted">
                  {new Date(txn.posted_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </div>
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{txn.description}</p>
                  <p className="text-xs text-muted">
                    {(txn.accounts as { account_name: string } | null)?.account_name}
                  </p>
                </div>
                <div
                  className={`w-24 text-right text-sm font-medium ${
                    txn.amount < 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  {formatMoney(txn.amount, decimalPlaces)}
                </div>
                <select
                  name="category_id"
                  defaultValue={txn.category_id ?? ""}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">Uncategorized</option>
                  {filterOptions.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  name="source_id"
                  defaultValue={txn.source_id ?? ""}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">No source</option>
                  {filterOptions.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    name="is_transfer"
                    defaultChecked={txn.is_transfer}
                  />
                  Transfer
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    name="exclude_from_budget"
                    defaultChecked={txn.exclude_from_budget}
                  />
                  Exclude from budget
                </label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={txn.notes ?? ""}
                  placeholder="Notes"
                  className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Save
                </button>
                {!txn.provider_transaction_id && (
                  <button
                    type="submit"
                    formAction={deleteTransaction.bind(null, txn.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-negative hover:bg-background"
                  >
                    Delete
                  </button>
                )}
              </form>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted">
                  {txn.is_split ? `Split into ${txnSplits.length} lines` : "Split transaction"}
                </summary>
                <form
                  action={saveSplits.bind(null, txn.id, txn.amount)}
                  className="mt-2 flex flex-col gap-2"
                >
                  {[1, 2, 3, 4].map((i) => {
                    const existing = txnSplits[i - 1];
                    return (
                      <div
                        key={existing?.id ?? `new-${i}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <select
                          name={`split_category_${i}`}
                          defaultValue={existing?.category_id ?? ""}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">No category</option>
                          {filterOptions.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name={`split_source_${i}`}
                          defaultValue={existing?.source_id ?? ""}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">No source</option>
                          {filterOptions.sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          name={`split_amount_${i}`}
                          defaultValue={existing?.amount ?? ""}
                          placeholder="Amount"
                          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted">
                    Split amounts must sum to {formatMoney(txn.amount, decimalPlaces)}. Leave
                    all fields blank to remove the split.
                  </p>
                  <button
                    type="submit"
                    className="w-fit rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background"
                  >
                    Save split
                  </button>
                </form>
              </details>
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted shadow-sm">
            No transactions match these filters.
          </div>
        )}
      </div>

      <form
        action={createManualTransaction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <p className="w-full text-sm font-medium">Add manual transaction</p>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Date
          <input
            type="date"
            name="posted_date"
            required
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Account
          <select
            name="account_id"
            required
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 min-w-40 flex-col gap-1 text-xs text-muted">
          Description
          <input
            type="text"
            name="description"
            required
            placeholder="e.g. Trader Joe's"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Amount (negative = expense)
          <input
            type="number"
            name="amount"
            step="0.01"
            required
            className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Category
          <select
            name="category_id"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Auto / uncategorized</option>
            {filterOptions.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Source
          <select
            name="source_id"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">No source</option>
            {filterOptions.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
        >
          Add
        </button>
      </form>
    </div>
  );
}
