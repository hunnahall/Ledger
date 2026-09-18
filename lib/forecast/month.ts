// mm/yy <-> YYYY-MM-01 conversions for Forecast entries — string-slicing
// only, no Date object round-trip, matching lib/format.ts's formatShortDate
// convention (avoids any timezone-shifting-the-day-back risk).

// "08/26" or "8/26" -> "2026-08-01", or null if not a valid m/yy string.
// Month accepts one or two digits — September is naturally typed "9", not
// "09", and a strict two-digit requirement silently rejected that input
// (the browser's `pattern` attribute blocks submission with no error
// shown), which made single-digit months look like the feature didn't work.
export function parseMonthYear(mmYY: string): string | null {
  const match = mmYY.trim().match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  const year = 2000 + Number(match[2]);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// "2026-08-01" -> "08/26"
export function formatMonthYear(monthISO: string): string {
  return `${monthISO.slice(5, 7)}/${monthISO.slice(2, 4)}`;
}

// "2026-08-01" -> "Aug 2026", for the month picker's option labels. Built
// with Date.UTC/timeZone: "UTC" rather than a plain `new Date(monthISO)`
// parse — the day component is always "01", so there's no local-timezone
// risk of shifting to the previous day, but pinning to UTC keeps this
// explicit rather than relying on the runtime's default zone.
export function monthLabel(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
