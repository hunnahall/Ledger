import Link from "next/link";
import { getSourcesWithBalance } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { getCurrentBudget } from "@/lib/queries/budgets";
import { CreateSourceForm } from "@/components/sources/create-source-form";
import { SourceCard } from "@/components/sources/source-card";
import { FundCard } from "@/components/sources/fund-card";
import { groupSourcesByType } from "@/lib/sources/group-sources";

export default async function SourcesPage() {
  // Awaited first, not in the Promise.all below: it resets the current
  // budget's linked source balance for the month if due, and
  // getSourcesWithBalance must see that write.
  const currentBudget = await getCurrentBudget();
  const [sources, settings] = await Promise.all([
    getSourcesWithBalance(),
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
        <p className="mt-1 text-sm text-muted">Your buckets that pay for transactions.</p>
      </div>

      <CreateSourceForm />

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

        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.fund.map((source) => (
            <FundCard
              key={source.id}
              fundId={source.fundId}
              name={source.fundName ?? source.name}
              balance={source.balance}
              decimalPlaces={decimalPlaces}
            />
          ))}
          {grouped.fund.length === 0 && (
            <p className="text-sm text-muted">
              No funds yet. Add one using the &ldquo;Fund&rdquo; type above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
