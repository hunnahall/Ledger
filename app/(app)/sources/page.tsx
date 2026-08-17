import { getSourcesWithContributions } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import {
  archiveSource,
  createContribution,
  createSource,
  deleteContribution,
  togglePullForward,
} from "@/lib/actions/sources";
import { formatMoney } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  current_budget: "Current budget",
  advance: "Advance",
  reimbursement: "Reimbursement",
  sinking_fund: "Sinking fund",
};

export default async function SourcesPage() {
  const [sources, settings] = await Promise.all([
    getSourcesWithContributions(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1 text-sm text-muted">
          Buckets that pay for transactions. Balances can go negative; scheduled
          contributions can be pulled forward into this month.
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
                  {source.is_reimbursement && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      Reimbursement
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
                {source.availableBalance !== source.balance && (
                  <p className="text-xs text-muted">
                    {formatMoney(source.availableBalance, decimalPlaces)} available with
                    pulled-forward contributions
                  </p>
                )}
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

            <div className="flex flex-col gap-2">
              {source.contributions.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-1 font-medium">Target month</th>
                      <th className="pb-1 font-medium">Amount</th>
                      <th className="pb-1 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {source.contributions.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-1.5">
                          {new Date(c.target_month).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </td>
                        <td className="py-1.5">{formatMoney(c.amount, decimalPlaces)}</td>
                        <td className="py-1.5 text-right">
                          <form
                            action={togglePullForward.bind(null, c.id, c.pulled_forward)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className={`rounded-md border border-border px-2 py-1 text-xs hover:bg-background ${
                                c.pulled_forward ? "bg-foreground text-surface" : ""
                              }`}
                            >
                              {c.pulled_forward ? "Available now" : "Pull forward"}
                            </button>
                          </form>
                          <form
                            action={deleteContribution.bind(null, c.id)}
                            className="ml-1 inline"
                          >
                            <button
                              type="submit"
                              className="rounded-md border border-border px-2 py-1 text-xs text-negative hover:bg-background"
                            >
                              &times;
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form
                action={createContribution.bind(null, source.id)}
                className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
              >
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Target month
                  <input
                    type="month"
                    name="target_month"
                    required
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Amount
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
                >
                  Schedule
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <form
        action={createSource}
        className="flex max-w-2xl flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          New source name
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Advance, Reimbursement"
            className="w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            name="type"
            defaultValue="general"
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
            name="balance"
            step="0.01"
            defaultValue={0}
            className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-muted">
          <input type="checkbox" name="is_reimbursement" />
          Reimbursement-style
        </label>
        <button
          type="submit"
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-surface"
        >
          Create
        </button>
      </form>
    </div>
  );
}
