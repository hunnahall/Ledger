import Link from "next/link";
import { getForecastCountsBySource, getSourceMonthChange, getSourcesWithBalance } from "@/lib/queries/sources";
import { getSettings } from "@/lib/queries/settings";
import { ensureBudgetCurrent } from "@/lib/queries/budgets";
import { currentMonthISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { AddSourceButton } from "@/components/sources/create-source-form";
import { SourceCard } from "@/components/sources/source-card";
import { Money } from "@/components/ui/money";
import { Stat, StatRow } from "@/components/ui/stat";
import { groupSourcesByType } from "@/lib/sources/group-sources";

// Budget group order: the Budget first, then the other system Sources.
const BUDGET_GROUP_ORDER = ["budget", "float", "sinking_fund", "income"];

export default async function SourcesPage() {
  // Awaited first, not in the Promise.all below: it resets the current
  // budget's linked source balance for the month if due, and
  // getSourcesWithBalance must see that write.
  await ensureBudgetCurrent();
  const settings = await getSettings();
  const [sources, monthChange, forecastCounts] = await Promise.all([
    getSourcesWithBalance(),
    getSourceMonthChange(currentMonthISO(settings.timezone)),
    getForecastCountsBySource(),
  ]);
  const decimalPlaces = settings.decimal_places;
  const money = (n: number) => formatMoney(n, decimalPlaces);
  const grouped = groupSourcesByType(sources);
  const budgetGroup = [...grouped.budget].sort(
    (a, b) => BUDGET_GROUP_ORDER.indexOf(a.type) - BUDGET_GROUP_ORDER.indexOf(b.type),
  );
  const sum = (list: { balance: number }[]) => list.reduce((total, s) => total + s.balance, 0);
  const budgetSource = sources.find((s) => s.type === "budget");
  const sinkingFund = sources.find((s) => s.type === "sinking_fund");

  const groups = [
    { key: "budget", label: "Budget", items: budgetGroup, empty: null },
    { key: "reimbursement", label: "Reimbursements", items: grouped.reimbursement, empty: "No reimbursement sources yet." },
    { key: "fund", label: "Funds", items: grouped.fund, empty: "No funds yet. Add one with Add source." },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Sources</h1>
          <p className="mt-1 text-sm text-muted">{sources.length} sources</p>
        </div>
        <AddSourceButton />
      </div>

      <StatRow>
        <Stat label="Total held" value={money(sum(sources))} caption={`${sources.length} sources`} />
        <Stat label="Budget left" value={budgetSource ? money(budgetSource.balance) : "None"} />
        <Stat label="Sinking fund" value={sinkingFund ? money(sinkingFund.balance) : "None"} />
        <Stat
          label="Funds"
          value={money(sum(grouped.fund))}
          caption={grouped.fund.length === 1 ? "1 fund" : `${grouped.fund.length} funds`}
        />
      </StatRow>

      {!budgetSource && (
        <p className="text-sm text-muted">
          No current budget set.{" "}
          <Link href="/budget" className="text-accent underline">
            Set one up
          </Link>
          .
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            <h2 className="font-mono text-[11px] font-medium">{group.label}</h2>
            <Money amount={sum(group.items)} decimalPlaces={decimalPlaces} className="text-foreground-secondary" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                monthChange={monthChange.get(source.id) ?? 0}
                forecastCount={forecastCounts.get(source.id) ?? 0}
                decimalPlaces={decimalPlaces}
              />
            ))}
            {group.items.length === 0 && group.empty && <p className="text-sm text-muted">{group.empty}</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
