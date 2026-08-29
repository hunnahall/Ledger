export function currentMonthISO() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

// First-of-next-month for a YYYY-MM-01 month string — an exclusive upper
// bound for "posted_date in this month" range queries.
export function nextMonthISO(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

// Number of days in a YYYY-MM-01 month string.
export function daysInMonthISO(monthISO: string): number {
  const [year, month] = monthISO.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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
