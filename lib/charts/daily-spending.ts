import { spendingByDay } from "@/lib/transactions/spending-by-day";
import type { Leg } from "@/lib/transactions/legs";
import type { DaySpent } from "@/lib/charts/heatmap";

/**
 * Outflows per day: negative amounts only (expense plus other outflows, the
 * same isOutflow rule as v_outflows), so a month's days sum to its Outflows.
 * Reuses the Transactions page's spendingByDay, whose rule is identical; days
 * between the first and last spending day are filled in as zero.
 */
export function dailySpending(legs: Leg[]): DaySpent[] {
  return spendingByDay(legs).map((d) => ({ date: d.date, spent: d.amount }));
}
