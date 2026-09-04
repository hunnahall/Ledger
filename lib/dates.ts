// Every "what month/day is it" question in the app resolves through here.
//
// These used to read UTC (`new Date().getUTCFullYear()` etc.). For any user
// west of UTC that made the last several hours of each local month already
// count as the next one, so the monthly budget reset, income sweep and
// sinking contribution fired early the moment a page was loaded in that
// window. The zone is now the user's own (settings.timezone), and the SQL
// side matches via user_month_start(user_id).

// en-CA formats as YYYY-MM-DD, so the parts come out already zero-padded
// and in the order the rest of the app stores dates in.
function partsInZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  } catch {
    // settings_validate_timezone_trigger keeps unresolvable zones out of the
    // database, so this is only reachable if a caller passes something else.
    // Falling back beats throwing out of a page render.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  }
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)!.value;
}

export const DEFAULT_TIME_ZONE = "UTC";

// Today's date in the user's zone, as YYYY-MM-DD.
export function todayISO(timeZone: string): string {
  const parts = partsInZone(new Date(), timeZone);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

// First-of-this-month in the user's zone, as YYYY-MM-01.
export function currentMonthISO(timeZone: string): string {
  const parts = partsInZone(new Date(), timeZone);
  return `${part(parts, "year")}-${part(parts, "month")}-01`;
}

// Day-of-month today in the user's zone (1-31).
export function currentDayOfMonth(timeZone: string): number {
  return Number(part(partsInZone(new Date(), timeZone), "day"));
}

// First-of-next-month for a YYYY-MM-01 month string — an exclusive upper
// bound for "posted_date in this month" range queries.
export function nextMonthISO(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

// First-of-previous-month for a YYYY-MM-01 month string — symmetric to
// nextMonthISO, used to walk backward (e.g. building the Dashboard's
// selectable-months list).
export function previousMonthISO(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
}

// Number of days in a YYYY-MM-01 month string.
export function daysInMonthISO(monthISO: string): number {
  const [year, month] = monthISO.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Calendar month-diff between two YYYY-MM-DD dates, floored at 1 — a target
// date in the past or the current month is treated as due now, avoiding
// divide-by-zero/negative when this feeds a monthly-contribution amount.
// Both arguments are plain date strings, so this is pure string arithmetic
// with no zone involved.
export function monthsRemaining(targetDate: string, from: string): number {
  const [targetYear, targetMonth] = targetDate.split("-").map(Number);
  const [fromYear, fromMonth] = from.split("-").map(Number);
  return Math.max(1, (targetYear - fromYear) * 12 + (targetMonth - fromMonth));
}

// "September 2026" — the long-form month heading, previously reimplemented
// identically in the Dashboard page and its month picker. Formatting a
// YYYY-MM-01 string in UTC is correct regardless of the viewer's zone: the
// string already names the month, there is nothing left to shift.
export function monthLabel(monthISO: string): string {
  return new Date(`${monthISO}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
