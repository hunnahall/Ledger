export type SpendingRow = {
  postedDate: string;
  amount: number;
  isTransfer: boolean;
  isIncome: boolean;
  excludeFromBudget: boolean;
  isSplit: boolean;
  splits: { amount: number }[];
};

export type DaySpending = { date: string; amount: number };

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Money spent per calendar day across the listed transactions: negative
 * amounts only, transfers and Excluded transactions left out, split
 * transactions counted by their legs. Days with nothing spent are filled in
 * as zero so the line runs continuously from the first day to the last.
 */
export function spendingByDay(rows: SpendingRow[]): DaySpending[] {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    if (r.isTransfer || r.excludeFromBudget) continue;
    const amounts = r.isSplit ? r.splits.map((s) => s.amount) : [r.amount];
    for (const a of amounts) {
      if (a < 0) perDay.set(r.postedDate, (perDay.get(r.postedDate) ?? 0) - a);
    }
  }
  if (perDay.size === 0) return [];
  const dates = [...perDay.keys()].sort();
  const out: DaySpending[] = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = addDays(d, 1)) {
    out.push({ date: d, amount: perDay.get(d) ?? 0 });
  }
  return out;
}
