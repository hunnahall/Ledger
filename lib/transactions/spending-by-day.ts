import { isOutflow, type Leg } from "@/lib/transactions/legs";

export type SpendingRow = Pick<Leg, "postedDate" | "amount" | "isIncome" | "categoryId" | "sourceId" | "sourceType">;

export type DaySpending = { date: string; amount: number };

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Money spent per calendar day: each day's `outflows` (expense plus other
 * outflows, the same rule as v_outflows). The rows arrive with transfers,
 * Excluded transactions and split originals already left out. Days with
 * nothing spent are filled in as zero so the line runs continuously from the
 * first day to the last.
 */
export function spendingByDay(rows: SpendingRow[]): DaySpending[] {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    if (!isOutflow({ ...r, id: "", description: "" })) continue;
    perDay.set(r.postedDate, (perDay.get(r.postedDate) ?? 0) - r.amount);
  }
  if (perDay.size === 0) return [];
  const dates = [...perDay.keys()].sort();
  const out: DaySpending[] = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = addDays(d, 1)) {
    out.push({ date: d, amount: Math.round((perDay.get(d) ?? 0) * 100) / 100 });
  }
  return out;
}
