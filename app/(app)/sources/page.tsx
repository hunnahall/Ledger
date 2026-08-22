import Link from "next/link";
import { getSourcesWithBalance, getFunds } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { getCurrentBudget } from "@/lib/queries/budgets";
import {
  archiveSource,
  adjustSourceBalance,
  setSourceBalance,
  createFund,
  archiveFund,
  adjustFundBalance,
  setFundBalance,
} from "@/lib/actions/sources";
import { CreateSourceForm } from "@/components/sources/create-source-form";
import { formatDate } from "@/lib/format";
import { groupSourcesByType } from "@/lib/sources/group-sources";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";

const TYPE_LABELS: Record<string, string> = {
  budget: "Budget",
  past_payment: "Past payment",
  future_repayment: "Future repayment",
  fund: "Fund",
};

function SourceCard({
  source,
  decimalPlaces,
}: {
  source: Awaited<ReturnType<typeof getSourcesWithBalance>>[number];
  decimalPlaces: number;
}) {
  return (
    <Card key={source.id} className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{source.name}</p>
            <Badge>{TYPE_LABELS[source.type] ?? source.type}</Badge>
            {source.type === "fund" && source.fundName && (
              <Badge>Fund: {source.fundName}</Badge>
            )}
            {(source.type === "past_payment" || source.type === "future_repayment") &&
              source.deposit_date && (
                <Badge>
                  {source.type === "past_payment" ? "Deposited" : "Expected"}{" "}
                  {formatDate(source.deposit_date)}
                </Badge>
              )}
          </div>
          <p
            className={`mt-1 text-lg font-semibold ${
              source.balance < 0 ? "text-negative" : ""
            }`}
          >
            <Money amount={source.balance} decimalPlaces={decimalPlaces} />
          </p>
        </div>
        <form action={archiveSource.bind(null, source.id)}>
          <Button type="submit" variant="secondary" tone="negative" size="sm" className="px-2 py-1 text-xs">
            Archive
          </Button>
        </form>
      </div>

      {source.type !== "fund" && (
        <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
          <form
            action={adjustSourceBalance.bind(null, source.id)}
            className="flex items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-muted">
              Adjust balance by
              <input
                type="number"
                name="amount"
                step="0.01"
                placeholder="e.g. 800 or -50"
                className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
          </form>
          <form
            action={setSourceBalance.bind(null, source.id)}
            className="flex items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-muted">
              Adjust balance to
              <input
                type="number"
                name="amount"
                step="0.01"
                placeholder="e.g. 1000"
                className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
          </form>
        </div>
      )}
      {source.type === "fund" && (
        <p className="border-t border-border pt-3 text-xs text-muted">
          Balance is managed on the linked fund below.
        </p>
      )}
    </Card>
  );
}

export default async function SourcesPage() {
  // Awaited first, not in the Promise.all below: it resets the current
  // budget's linked source balance for the month if due, and
  // getSourcesWithBalance must see that write.
  const currentBudget = await getCurrentBudget();
  const [sources, funds, settings] = await Promise.all([
    getSourcesWithBalance(),
    getFunds(),
    getSettings(),
  ]);
  const decimalPlaces = settings.decimal_places;
  const grouped = groupSourcesByType(sources);
  const budgetSource = currentBudget
    ? sources.find((s) => s.budget_id === currentBudget.id)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1 text-sm text-muted">
          Buckets that pay for transactions. Balances update automatically from
          transactions and can also be adjusted by hand. Balances can go negative.
        </p>
      </div>

      <CreateSourceForm funds={funds.map((f) => ({ id: f.id, name: f.name }))} />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Budget</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {budgetSource && (
            <SourceCard key={budgetSource.id} source={budgetSource} decimalPlaces={decimalPlaces} />
          )}
          {!budgetSource && (
            <p className="text-sm text-muted">
              No current budget set.{" "}
              <Link href="/budgets" className="underline">
                Set one up
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-border pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Past Payments</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.pastPayment.map((source) => (
            <SourceCard key={source.id} source={source} decimalPlaces={decimalPlaces} />
          ))}
          {grouped.pastPayment.length === 0 && (
            <p className="text-sm text-muted">No past payment sources yet.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-border pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Future Repayments</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.futureRepayment.map((source) => (
            <SourceCard key={source.id} source={source} decimalPlaces={decimalPlaces} />
          ))}
          {grouped.futureRepayment.length === 0 && (
            <p className="text-sm text-muted">No future repayment sources yet.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-border pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Funds</h2>

        <Card className="max-w-lg p-4">
          <form action={createFund} className="flex flex-wrap items-end gap-3">
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
              Balance
              <input
                type="number"
                name="balance"
                step="0.01"
                defaultValue={0}
                className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit" variant="accent">
              Create
            </Button>
          </form>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {funds.map((fund) => (
            <Card key={fund.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{fund.name}</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      fund.balance < 0 ? "text-negative" : ""
                    }`}
                  >
                    <Money amount={fund.balance} decimalPlaces={decimalPlaces} />
                  </p>
                </div>
                <form action={archiveFund.bind(null, fund.id)}>
                  <Button type="submit" variant="secondary" tone="negative" size="sm" className="px-2 py-1 text-xs">
                    Archive
                  </Button>
                </form>
              </div>

              <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
                <form
                  action={adjustFundBalance.bind(null, fund.id)}
                  className="flex items-end gap-2"
                >
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Adjust balance by
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      placeholder="e.g. 800 or -50"
                      className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <Button type="submit" variant="secondary" size="sm">
                    Apply
                  </Button>
                </form>
                <form
                  action={setFundBalance.bind(null, fund.id)}
                  className="flex items-end gap-2"
                >
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Adjust balance to
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      placeholder="e.g. 1000"
                      className="w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <Button type="submit" variant="secondary" size="sm">
                    Apply
                  </Button>
                </form>
              </div>
            </Card>
          ))}
          {funds.length === 0 && <p className="text-sm text-muted">No funds yet.</p>}
        </div>

        {grouped.fund.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-label text-xs font-semibold uppercase tracking-wide text-muted">
              Sources linked to a fund
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {grouped.fund.map((source) => (
                <SourceCard key={source.id} source={source} decimalPlaces={decimalPlaces} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
