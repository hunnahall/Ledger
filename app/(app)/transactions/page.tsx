import {
  getFilteredTransactions,
  getFilterOptions,
  getTransactionSplits,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import { getAccounts } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { createManualTransaction } from "@/lib/actions/transactions";
import { encodeBucketOption } from "@/lib/transactions/bucket-option";
import { Button } from "@/components/ui/button";
import { TransactionList, type TransactionRowData } from "@/components/transactions/transaction-list";

type SearchParams = {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  category_id?: string;
  source_id?: string;
  uncategorized?: string;
  search?: string;
};

function buildQueryString(params: SearchParams) {
  const usp = new URLSearchParams();
  if (params.date_from) usp.set("date_from", params.date_from);
  if (params.date_to) usp.set("date_to", params.date_to);
  if (params.account_id) usp.set("account_id", params.account_id);
  if (params.category_id) usp.set("category_id", params.category_id);
  if (params.source_id) usp.set("source_id", params.source_id);
  if (params.uncategorized) usp.set("uncategorized", params.uncategorized);
  if (params.search) usp.set("search", params.search);
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
    search: params.search,
  };

  const [transactions, filterOptions, accounts, settings] = await Promise.all([
    getFilteredTransactions(filters),
    getFilterOptions(),
    getAccounts(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  const bucketOptions = [
    ...filterOptions.sources.map((s) => ({ value: encodeBucketOption({ type: "source", id: s.id }), label: s.name })),
    ...filterOptions.funds.map((f) => ({ value: encodeBucketOption({ type: "fund", id: f.id }), label: `${f.name} (fund)` })),
  ];
  const bucketNameByValue = Object.fromEntries(bucketOptions.map((b) => [b.value, b.label]));

  const splits = await getTransactionSplits(transactions.map((t) => t.id));
  const splitsByTransaction = new Map<string, typeof splits>();
  for (const split of splits) {
    const list = splitsByTransaction.get(split.transaction_id) ?? [];
    list.push(split);
    splitsByTransaction.set(split.transaction_id, list);
  }

  const transactionRows: TransactionRowData[] = transactions.map((txn) => ({
    id: txn.id,
    updatedAt: txn.updated_at,
    postedDate: txn.posted_date,
    description: txn.description,
    accountName: (txn.accounts as { account_name: string } | null)?.account_name ?? null,
    amount: txn.amount,
    categoryId: txn.category_id,
    sourceId: txn.source_id,
    isTransfer: txn.is_transfer,
    transferFromSourceId: txn.transfer_from_source_id,
    transferFromFundId: txn.transfer_from_fund_id,
    transferToSourceId: txn.transfer_to_source_id,
    transferToFundId: txn.transfer_to_fund_id,
    excludeFromBudget: txn.exclude_from_budget,
    notes: txn.notes,
    isSplit: txn.is_split,
    hasProviderTransactionId: Boolean(txn.provider_transaction_id),
    splits: (splitsByTransaction.get(txn.id) ?? []).map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      sourceId: s.source_id,
      amount: s.amount,
    })),
  }));

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

      <section className="flex flex-col gap-3">
        <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Filters</p>
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted">
            Search
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="e.g. Trader Joe's"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
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
          <Button type="submit" size="sm">
            Filter
          </Button>
          <a href="/transactions" className="text-sm text-muted hover:underline">
            Clear
          </a>
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-border pt-6">
        <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">
          Manual transactions
        </p>
        <form
          action={createManualTransaction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        >
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
              defaultValue={filterOptions.defaultSourceId ?? ""}
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
          <label className="flex items-center gap-1.5 pb-2 text-xs text-muted">
            <input type="checkbox" name="is_transfer" />
            Transfer
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Transfer from (optional)
            <select
              name="transfer_from"
              defaultValue=""
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {bucketOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Transfer to (optional)
            <select
              name="transfer_to"
              defaultValue=""
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {bucketOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-border pt-6">
        <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Transactions</p>
        <TransactionList
          transactions={transactionRows}
          categories={filterOptions.categories}
          sources={filterOptions.sources}
          bucketOptions={bucketOptions}
          bucketNameByValue={bucketNameByValue}
          decimalPlaces={decimalPlaces}
        />
      </section>
    </div>
  );
}
