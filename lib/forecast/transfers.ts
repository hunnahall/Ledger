/**
 * The monthly amount moved into a Source by its Source Transfers: their sum,
 * or null when there are none (so a forecast can tell "no live transfer" from
 * a transfer of $0).
 */
export function sumTransferAmounts(amounts: number[]): number | null {
  if (amounts.length === 0) return null;
  // Cents, to keep sums like 0.1 + 0.2 exact.
  return amounts.reduce((sum, a) => sum + Math.round(a * 100), 0) / 100;
}
