export function currentMonthISO() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

// UTC month-diff between two YYYY-MM-DD dates, floored at 1 — a target date
// in the past or the current month is treated as due now, avoiding
// divide-by-zero/negative when this feeds a monthly-contribution amount.
export function monthsRemaining(targetDate: string, from: string = currentMonthISO()): number {
  const target = new Date(targetDate);
  const fromDate = new Date(from);
  const months =
    (target.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - fromDate.getUTCMonth());
  return Math.max(1, months);
}
