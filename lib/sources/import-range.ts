// Shared by ImportTransactionsForm (client-side validation as the user
// picks dates) and importBankConnectionRange (lib/actions/simplefin.ts,
// the server-side check that actually enforces the limit) — must stay in
// sync or the client will accept a range the server then rejects.
export const MAX_IMPORT_DAYS = 90;

const MS_PER_DAY = 86400000;

// Inclusive day count between two YYYY-MM-DD dates (UTC), or null if either
// is missing/invalid.
export function daysBetween(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const diff =
    Math.round(
      (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
        MS_PER_DAY,
    ) + 1;
  return Number.isFinite(diff) ? diff : null;
}
