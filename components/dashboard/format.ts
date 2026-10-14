// Small display helpers shared by the Dashboard charts.

/** "Oct" for "2026-10-01". Month ISO strings are calendar dates, so UTC avoids a zone shift. */
export function shortMonthLabel(monthISO: string): string {
  return new Date(`${monthISO}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

/** Axis label: "$8k", "$750". */
export function compactMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${Math.round(abs / 100) / 10}k`.replace(".0k", "k");
  return `${sign}$${Math.round(abs)}`;
}

/** Rounds a chart maximum up to a tidy number so axis ticks land on round values. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}
