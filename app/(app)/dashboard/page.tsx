import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getSettings } from "@/lib/queries/settings";
import { formatDate } from "@/lib/format";
import { computeProgress } from "@/lib/progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";

export default async function DashboardPage() {
  const [data, settings] = await Promise.all([getDashboardData(), getSettings()]);
  const decimalPlaces = settings.decimal_places;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {data.currentBudget ? data.currentBudget.name : "No current budget set"} &middot;{" "}
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs text-muted">Inflow</p>
          <p className="mt-1 text-xl font-semibold text-positive">
            <Money amount={data.inflow} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Budgeted Outflow</p>
          <p className="mt-1 text-xl font-semibold text-negative">
            <Money amount={data.budgetedOutflow} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Other Outflow</p>
          <p className="mt-1 text-xl font-semibold text-negative">
            <Money amount={data.otherOutflow} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Total Net</p>
          <p
            className={`mt-1 text-xl font-semibold ${data.totalNet < 0 ? "text-negative" : ""}`}
          >
            <Money amount={data.totalNet} decimalPlaces={decimalPlaces} />
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 font-medium">Spending by category</p>
          {data.categorySpending.length === 0 && (
            <p className="text-sm text-muted">
              No categories in your current budget yet.{" "}
              <Link href="/budgets" className="underline">
                Set one up
              </Link>
              .
            </p>
          )}
          <div className="flex flex-col gap-3">
            {data.categorySpending.map((c) => {
              const { over } = computeProgress({ total: c.monthly_amount, spent: c.spent });
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className={over ? "text-negative" : "text-muted"}>
                      <Money amount={c.spent} decimalPlaces={decimalPlaces} /> /{" "}
                      <Money amount={c.monthly_amount} decimalPlaces={decimalPlaces} />
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar total={c.monthly_amount} spent={c.spent} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 font-medium">Account balances</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.accountBalances.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span>{a.account_name}</span>
                <span>
                  <Money amount={a.current_balance ?? 0} decimalPlaces={decimalPlaces} />
                </span>
              </div>
            ))}
            {data.accountBalances.length === 0 && (
              <p className="text-muted">
                No accounts yet.{" "}
                <Link href="/accounts" className="underline">
                  Add one
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 font-medium">Source balances</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.sourceBalances.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className={(s.balance ?? 0) < 0 ? "text-negative" : ""}>
                  <Money amount={s.balance ?? 0} decimalPlaces={decimalPlaces} />
                </span>
              </div>
            ))}
            {data.sourceBalances.length === 0 && (
              <p className="text-muted">
                No sources yet.{" "}
                <Link href="/sources" className="underline">
                  Add one
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 font-medium">Reimbursements pending</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.reimbursementsPending.map((r) => (
              <div key={r.id} className="flex justify-between">
                <div>
                  <span>{r.name}</span>
                  {r.deposit_date && (
                    <span className="ml-2 text-xs text-muted">{formatDate(r.deposit_date)}</span>
                  )}
                </div>
                <span className={(r.balance ?? 0) < 0 ? "text-negative" : "text-positive"}>
                  <Money amount={r.balance ?? 0} decimalPlaces={decimalPlaces} />
                </span>
              </div>
            ))}
            {data.reimbursementsPending.length === 0 && (
              <p className="text-muted">Nothing outstanding.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
