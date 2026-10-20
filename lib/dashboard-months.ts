// Which months the Dashboard shows. Any mix of the months Ledger keeps can be
// picked: one, several, or all. Every chart is scoped to exactly that set.
// The URL carries it as ?months=2026-10-01,2026-08-01 or ?months=all; no
// param means the current month, so the page follows the calendar forward.

import { daysInMonthISO, previousMonthISO } from "@/lib/dates";

/** How many months Ledger keeps: the current one plus the 3 before it (purge_expired_data). */
export const RETAINED_MONTHS = 4;

const MONTH_RE = /^\d{4}-\d{2}-01$/;

/** The months that can be shown, newest first. */
export function selectableMonths(currentMonth: string): string[] {
  const months = [currentMonth];
  while (months.length < RETAINED_MONTHS) months.push(previousMonthISO(months[months.length - 1]));
  return months;
}

/** The selected months from the URL, oldest first; the current month when nothing valid is given. */
export function parseMonthSelection(param: string | undefined, selectable: string[]): string[] {
  if (param === "all") return [...selectable].sort();
  const picked = (param ?? "").split(",").filter((m) => MONTH_RE.test(m) && selectable.includes(m));
  const unique = [...new Set(picked)].sort();
  return unique.length > 0 ? unique : [selectable[0]];
}

/** The URL value for a selection, or null for the default (the current month alone). */
export function selectionParam(selected: string[], selectable: string[]): string | null {
  if (selected.length === selectable.length) return "all";
  if (selected.length === 1 && selected[0] === selectable[0]) return null;
  return [...selected].sort().join(",");
}

/**
 * Clicking a month. From "all", it narrows to just that month (the usual
 * intent). Otherwise it adds or removes the month, and the last one left
 * can't be removed.
 */
export function toggleMonth(selected: string[], month: string, selectable: string[]): string[] {
  if (selected.length === selectable.length) return [month];
  if (selected.includes(month)) {
    return selected.length === 1 ? selected : selected.filter((m) => m !== month);
  }
  return [...selected, month].sort();
}

/** "October 2026", "Aug, Sep and Oct 2026", "All months, Jul to Oct 2026". */
export function selectionLabel(selected: string[], selectable: string[]): string {
  const long = (m: string) =>
    new Date(`${m}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const short = (m: string) => new Date(`${m}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = (m: string) => m.slice(0, 4);
  const sorted = [...selected].sort();
  if (sorted.length === 1) return long(sorted[0]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const sameYear = year(first) === year(last);
  if (sorted.length === selectable.length) {
    return `All months, ${short(first)}${sameYear ? "" : ` ${year(first)}`} to ${short(last)} ${year(last)}`;
  }
  const names = sorted.map(short);
  const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return sameYear ? `${list} ${year(last)}` : `${list} (${year(first)} to ${year(last)})`;
}

/** How many days of `month` have happened by `today` (YYYY-MM-DD): all of a past month, none of a future one. */
export function daysElapsed(month: string, today: string): number {
  const days = daysInMonthISO(month);
  if (today.slice(0, 7) > month.slice(0, 7)) return days;
  if (today.slice(0, 7) < month.slice(0, 7)) return 0;
  return Math.min(days, Number(today.slice(8, 10)));
}

/** Share of the selected months' days that have happened (0-1). */
export function selectionProgress(months: string[], today: string): number {
  const total = months.reduce((sum, m) => sum + daysInMonthISO(m), 0);
  const elapsed = months.reduce((sum, m) => sum + daysElapsed(m, today), 0);
  return total > 0 ? elapsed / total : 0;
}
