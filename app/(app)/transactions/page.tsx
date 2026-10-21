import {
  getFilteredTransactions,
  getFilterOptions,
  getSpendingRows,
  getSplitGroups,
  getTransferDestinations,
} from "@/lib/queries/transactions";
import Link from "next/link";
import {
  NO_SOURCE_FILTER_VALUE,
  resolveCategoryFilter,
  resolveSourceFilter,
  summarizeTransactions,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import { formatMoney } from "@/lib/format";
import { ClearFiltersButton } from "@/components/transactions/column-filter";
import { getSettings } from "@/lib/queries/settings";
import { TransactionList, type TransactionRowData } from "@/components/transactions/transaction-list";
import { AddTransactionButton } from "@/components/transactions/manual-transaction-form";
import { ExportMenu } from "@/components/transactions/export-menu";
import { SyncButton } from "@/components/transactions/sync-button";
import { SpendingByDayChart } from "@/components/transactions/spending-by-day-chart";
import { spendingByDay } from "@/lib/transactions/spending-by-day";

type SearchParams = {
  date_from?: string;
  date_to?: string;
  account_id?: string;
  category_id?: string;
  source_id?: string;
  search?: string;
  txn?: string;
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

  const [transactions, filterOptions, settings, spendingRows, splitGroups, transferDestinations] = await Promise.all([
    getFilteredTransactions(filters),
    getFilterOptions(),
    getSettings(),
    getSpendingRows(),
    getSplitGroups(),
    getTransferDestinations(),
  ]);
  const decimalPlaces = settings.decimal_places;

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
    isTransferCopy: Boolean(txn.transfer_of),
    transferToSourceId: transferDestinations.get(txn.id) ?? null,
    isIncome: txn.is_income,
    excludeFromBudget: txn.exclude_from_budget,
    notes: txn.notes,
    hasProviderTransactionId: Boolean(txn.provider_transaction_id),
    split: txn.split_parent_id ? (splitGroups.get(txn.split_parent_id) ?? null) : null,
  }));

  const days = spendingByDay(spendingRows);

  const summary = summarizeTransactions(transactionRows);
  const noSourceHref = `/transactions?${new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).filter(([k, v]) => k !== "source_id" && v)),
    source_id: NO_SOURCE_FILTER_VALUE,
  }).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Transactions</h1>
          <p className="mt-1 font-mono text-xs text-muted tabular-nums">
            {summary.count === 1 ? "1 transaction" : `${summary.count.toLocaleString("en-US")} transactions`}
            {summary.withoutSource > 0 && (
              <>
                {" · "}
                <Link href={noSourceHref} className="text-accent underline underline-offset-2">
                  {summary.withoutSource} without a Source
                </Link>
              </>
            )}
            {" · "}Net {formatMoney(summary.net, decimalPlaces, { symbol: false })}
            <ClearFiltersButton className="ml-3 font-sans text-foreground underline underline-offset-2 hover:text-accent" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncButton />
          <ExportMenu />
          <AddTransactionButton
            categories={filterOptions.categories}
            sources={filterOptions.sources}
            defaultSourceId={filterOptions.defaultSourceId}
            defaultAccountId={filterOptions.defaultAccountId}
            advanced={settings.budget_type === "advanced"}
          />
        </div>
      </div>

      <SpendingByDayChart days={days} decimalPlaces={decimalPlaces} />

      <section>
        <TransactionList
          transactions={transactionRows}
          categories={filterOptions.categories}
          sources={filterOptions.sources}
          decimalPlaces={decimalPlaces}
          budgetSourceId={filterOptions.defaultSourceId}
          incomeSourceId={filterOptions.incomeSourceId}
          focusId={params.txn}
        />
      </section>
    </div>
  );
}
