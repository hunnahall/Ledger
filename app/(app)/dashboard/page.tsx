import Link from "next/link";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getSettings } from "@/lib/queries/settings";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const [data, settings] = await Promise.all([getDashboardData(), getSettings()]);
  const decimalPlaces = settings.decimal_places;
  const money = (n: number) => formatMoney(n, decimalPlaces);

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
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted">Inflow this month</p>
          <p className="mt-1 text-xl font-semibold text-positive">{money(data.inflow)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted">Outflow this month</p>
          <p className="mt-1 text-xl font-semibold text-negative">{money(data.outflow)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted">Net this month</p>
          <p className="mt-1 text-xl font-semibold">{money(data.inflow + data.outflow)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted">Float outstanding</p>
          <p
            className={`mt-1 text-xl font-semibold ${
              data.floatOutstanding < 0 ? "text-negative" : ""
            }`}
          >
            {money(data.floatOutstanding)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
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
              const pct =
                c.monthly_amount > 0
                  ? Math.max(0, Math.min(100, Math.round((c.spent / c.monthly_amount) * 100)))
                  : 0;
              const over = c.spent > c.monthly_amount && c.monthly_amount > 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className={over ? "text-negative" : "text-muted"}>
                      {money(c.spent)} / {money(c.monthly_amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full ${over ? "bg-negative" : "bg-foreground"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="mb-3 font-medium">Account balances</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.accountBalances.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span>{a.account_name}</span>
                <span>{money(a.current_balance ?? 0)}</span>
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
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="mb-3 font-medium">Source balances</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.sourceBalances.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className={(s.balance ?? 0) < 0 ? "text-negative" : ""}>
                  {money(s.balance ?? 0)}
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
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="mb-3 font-medium">Reimbursements pending</p>
          <div className="flex flex-col gap-2 text-sm">
            {data.reimbursementsPending.map((r) => (
              <div key={r.id} className="flex justify-between">
                <span>{r.name}</span>
                <span className={(r.balance ?? 0) < 0 ? "text-negative" : "text-positive"}>
                  {money(r.balance ?? 0)}
                </span>
              </div>
            ))}
            {data.reimbursementsPending.length === 0 && (
              <p className="text-muted">Nothing outstanding.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
