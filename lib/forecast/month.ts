// mm/yy <-> YYYY-MM-01 conversions for Forecast entries — string-slicing
// only, no Date object round-trip, matching lib/format.ts's formatShortDate
// convention (avoids any timezone-shifting-the-day-back risk).

// "08/26" -> "2026-08-01", or null if not a valid mm/yy string.
export function parseMonthYear(mmYY: string): string | null {
  const match = mmYY.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  const year = 2000 + Number(match[2]);
  return `${year}-${match[1]}-01`;
}

// "2026-08-01" -> "08/26"
export function formatMonthYear(monthISO: string): string {
  return `${monthISO.slice(5, 7)}/${monthISO.slice(2, 4)}`;
}
