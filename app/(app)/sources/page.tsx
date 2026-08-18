import { getSourcesWithBalance, getFunds } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import {
  archiveSource,
  adjustSourceBalance,
  createFund,
  archiveFund,
  adjustFundBalance,
} from "@/lib/actions/sources";
import { CreateSourceForm } from "@/components/sources/create-source-form";
import { formatMoney } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  budget: "Budget",
  past_payment: "Past payment",
  future_repayment: "Future repayment",
  fund: "Fund",
};

export default async function SourcesPage() {
  const [sources, funds, settings] = await Promise.all([
    getSourcesWithBalance(),
    getFunds(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1 text-sm text-muted">
          Buckets that pay for transactions. Balances update automatically from
          transactions and can also be adjusted by hand. Balances can go negative.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{source.name}</p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {TYPE_LABELS[source.type] ?? source.type}
                  </span>
                  {source.type === "fund" && source.fundName && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      Fund: {source.fundName}
                    </span>
                  )}
                  {(source.type === "past_payment" || source.type === "future_repayment") &&
                    source.deposit_date && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                        {source.type === "past_payment" ? "Deposited" : "Expected"}{" "}
                        {new Date(source.deposit_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </span>
                    )}
                </div>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    source.balance < 0 ? "text-negative" : ""
                  }`}
                >
                  {formatMoney(source.balance, decimalPlaces)}
                </p>
              </div>
              <form action={archiveSource.bind(null, source.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-border px-2 py-1 text-xs text-negative hover:bg-background"
                >
                  Archive
                </button>
              </form>
            </div>

            {source.type !== "fund" && (
              <form
                action={adjustSourceBalance.bind(null, source.id)}
                className="flex items-end gap-2 border-t border-border pt-3"
              >
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Adjust balance
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="e.g. 800 or -50"
                    className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Apply
                </button>
              </form>
            )}
            {source.type === "fund" && (
              <p className="border-t border-border pt-3 text-xs text-muted">
                Balance is managed on the linked fund below.
              </p>
            )}
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-sm text-muted">No sources yet — create one below.</p>
        )}
      </div>

      <CreateSourceForm funds={funds.map((f) => ({ id: f.id, name: f.name }))} />

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Funds</h2>
          <p className="mt-1 text-sm text-muted">
            Sinking funds that Fund-type sources draw from — e.g. a Travel Fund a
            transaction can be paid out of.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {funds.map((fund) => (
            <div
              key={fund.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{fund.name}</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      fund.balance < 0 ? "text-negative" : ""
                    }`}
                  >
                    {formatMoney(fund.balance, decimalPlaces)}
                  </p>
                </div>
                <form action={archiveFund.bind(null, fund.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1 text-xs text-negative hover:bg-background"
                  >
                    Archive
                  </button>
                </form>
              </div>

              <form
                action={adjustFundBalance.bind(null, fund.id)}
                className="flex items-end gap-2 border-t border-border pt-3"
              >
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Adjust balance
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    placeholder="e.g. 800 or -50"
                    className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Apply
                </button>
              </form>
            </div>
          ))}
          {funds.length === 0 && (
            <p className="text-sm text-muted">No funds yet — create one below.</p>
          )}
        </div>

        <form
          action={createFund}
          className="flex max-w-lg flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm">
            New fund name
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Travel Fund"
              className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Starting balance
            <input
              type="number"
              name="balance"
              step="0.01"
              defaultValue={0}
              className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
