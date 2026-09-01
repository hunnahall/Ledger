import { nextMonthISO } from "@/lib/dates";

export type ForecastEntryInput = {
  month: string; // YYYY-MM-01
  isExpense: boolean;
  amount: number; // positive magnitude
};

export type ForecastPoint = { monthISO: string; value: number };

// Cumulative running balance: each month adds the recurring monthly
// transfer, then applies that month's manual entries — starting with the
// first (current) month, not a month later — so an expense entered for the
// current month reduces that same month's point, matching how a real
// ledger balance would already reflect it.
export function projectForecast({
  startingBalance,
  monthlyTransfer,
  entries,
  startMonthISO,
  months = 12,
}: {
  startingBalance: number;
  monthlyTransfer: number;
  entries: ForecastEntryInput[];
  startMonthISO: string;
  months?: number;
}): ForecastPoint[] {
  const byMonth = new Map<string, { expenses: number; deposits: number }>();
  for (const entry of entries) {
    const bucket = byMonth.get(entry.month) ?? { expenses: 0, deposits: 0 };
    if (entry.isExpense) bucket.expenses += entry.amount;
    else bucket.deposits += entry.amount;
    byMonth.set(entry.month, bucket);
  }

  const points: ForecastPoint[] = [];
  let running = startingBalance;
  let monthISO = startMonthISO;
  for (let i = 0; i < months; i++) {
    const bucket = byMonth.get(monthISO);
    running = running + monthlyTransfer - (bucket?.expenses ?? 0) + (bucket?.deposits ?? 0);
    points.push({ monthISO, value: running });
    monthISO = nextMonthISO(monthISO);
  }
  return points;
}
