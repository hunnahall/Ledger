// A Source's balance for each day of the kept window. Days from the first
// recorded one on come from `source_balance_days` (the closing balance of
// each day, carried forward over days with no change). Days before that were
// never recorded, so they're estimated by walking back from the first
// recorded balance, undoing the changes we can still see: the Source's
// transactions and the balance changes in the Log. Anything that moved the
// balance without leaving either trace makes the estimate drift, which is why
// the chart draws estimated days dashed.

export type BalancePoint = { date: string; balance: number; estimated: boolean };
export type BalanceEvent = { date: string; delta: number };

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * `recorded` is the closing balance by day (any order). `events` are the
 * known changes to the balance, dated. With nothing recorded the current
 * balance stands in as today's record.
 */
export function buildBalanceSeries({
  windowStart,
  today,
  currentBalance,
  recorded,
  events,
}: {
  windowStart: string;
  today: string;
  currentBalance: number;
  recorded: { day: string; balance: number }[];
  events: BalanceEvent[];
}): BalancePoint[] {
  const known = [...recorded].filter((r) => r.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  if (known.length === 0) known.push({ day: today, balance: currentBalance });
  const first = known[0];

  // Net change per day, so the walk back is one pass.
  const changeOn = new Map<string, number>();
  for (const e of events) changeOn.set(e.date, (changeOn.get(e.date) ?? 0) + e.delta);

  // Estimated closing balance for each day before the first record: the
  // balance at the end of the day after it, minus that day's changes.
  const estimates = new Map<string, number>();
  let endOfNext = first.balance;
  for (let d = first.day; d > windowStart; ) {
    endOfNext -= changeOn.get(d) ?? 0;
    d = addDays(d, -1);
    estimates.set(d, endOfNext);
  }

  const points: BalancePoint[] = [];
  let k = 0;
  let carried = first.balance;
  for (let d = windowStart; d <= today; d = addDays(d, 1)) {
    if (d < first.day) {
      points.push({ date: d, balance: round(estimates.get(d) ?? first.balance), estimated: true });
      continue;
    }
    while (k < known.length && known[k].day <= d) carried = known[k++].balance;
    points.push({ date: d, balance: round(carried), estimated: false });
  }
  return points;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** "$1,234.56", "290.00" or "-719.04" as a number; null for anything else (text like "active ($3878.00)"). */
export function parseLogMoney(text: string | null): number | null {
  if (text == null) return null;
  const cleaned = text.replace(/[$,\s]/g, "");
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
}

/**
 * The balance change a Log entry records for this Source, or null when the
 * entry isn't a balance change for it. Balance entries are named
 * "<name> — Balance" (a manual edit) or "<name> balance (<reason>)" (a
 * Source Transfer, sweep, reset or contribution).
 */
export function logBalanceDelta(
  entry: { variable: string; old_value: string | null; new_value: string | null },
  sourceName: string,
): number | null {
  const v = entry.variable;
  const matches = v === `${sourceName} — Balance` || v.startsWith(`${sourceName} balance (`);
  if (!matches) return null;
  const before = parseLogMoney(entry.old_value);
  const after = parseLogMoney(entry.new_value);
  return before == null || after == null ? null : round(after - before);
}
