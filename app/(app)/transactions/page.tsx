import {
  getFilteredTransactions,
  getFilterOptions,
  getTransactionSplits,
  resolveCategoryFilter,
  resolveSourceFilter,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import { getAccounts } from "@/lib/queries/accounts";
import { getSettings } from "@/lib/queries/settings";
import { encodeBucketOption } from "@/lib/transactions/bucket-option";
import { TransactionList, type TransactionRowData } from "@/components/transactions/transaction-list";
import { ManualTransactionForm } from "@/components/transactions/manual-transaction-form";
import { ExportMenu } from "@/components/transactions/export-menu";

type SearchParams = {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  category_id?: string;
  source_id?: string;
  search?: string;
};

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
    search: params.search,
    ...resolveCategoryFilter(params.category_id),
    ...resolveSourceFilter(params.source_id),
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
    accountName: (txn.accounts as { account_name: string; last4: string | null } | null)?.account_name ?? null,
    accountLast4: (txn.accounts as { account_name: string; last4: string | null } | null)?.last4 ?? null,
    amount: txn.amount,
    categoryId: txn.category_id,
    categorySource: txn.category_source,
    sourceId: txn.source_id,
    isTransfer: txn.is_transfer,
    isIncome: txn.is_income,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-muted">Your income and expenses.</p>
        </div>
        <ExportMenu />
      </div>

      <section className="flex flex-col gap-3">
        <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">
          Manual transactions
        </p>
        <ManualTransactionForm
          accounts={accounts.map((a) => ({ id: a.id, name: a.account_name }))}
          categories={filterOptions.categories}
          sources={filterOptions.sources}
          bucketOptions={bucketOptions}
          defaultSourceId={filterOptions.defaultSourceId}
          monthAhead={settings.month_ahead}
        />
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-border pt-6">
        <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">Transactions</p>
        <TransactionList
          transactions={transactionRows}
          accounts={filterOptions.accounts}
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
