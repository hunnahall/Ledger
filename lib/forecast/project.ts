import { nextMonthISO } from "@/lib/dates";

type ForecastEntryInput = {
  month: string; // YYYY-MM-01
  isExpense: boolean;
  amount: number; // positive magnitude
};

export type ForecastPoint = { monthISO: string; value: number };

// Cumulative running balance. The first (current) month starts from the
// Source's actual current balance rather than adding another monthly
// transfer on top of it — that transfer, if due, is already reflected in
// the live balance — but still applies any manual entries logged against
// the current month, so those still move the starting point. Every month
// after that adds the recurring transfer, then applies that month's manual
// entries.
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
    running =
      running +
      (i === 0 ? 0 : monthlyTransfer) -
      (bucket?.expenses ?? 0) +
      (bucket?.deposits ?? 0);
    points.push({ monthISO, value: running });
    monthISO = nextMonthISO(monthISO);
  }
  return points;
}
