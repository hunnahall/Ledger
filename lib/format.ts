export function formatMoney(amount: number, decimalPlaces: number = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);
}

// Splits a formatted currency string into the whole-dollar part and the
// fractional (cents) part so callers can de-emphasize cents visually
// (e.g. <Money>) — the fintech "$5,216,471.18" pattern where cents render
// smaller than the whole-dollar amount.
export function formatMoneyParts(amount: number, decimalPlaces: number = 2) {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).formatToParts(amount);

  const fractionIndex = parts.findIndex((p) => p.type === "decimal");
  if (decimalPlaces === 0 || fractionIndex === -1) {
    return { whole: parts.map((p) => p.value).join(""), fraction: null };
  }

  return {
    whole: parts
      .slice(0, fractionIndex)
      .map((p) => p.value)
      .join(""),
    fraction: parts
      .slice(fractionIndex)
      .map((p) => p.value)
      .join(""),
  };
}

// Dates are stored as plain `date` columns (no time component); formatting
// in UTC avoids the local-timezone-shifting-the-day-back bug that plain
// `new Date(dateString)` display is prone to.
export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Compact MM/DD display (e.g. transactions table rows) — sliced straight
// off the YYYY-MM-DD column rather than parsed as a Date, so there's no
// timezone-shifting-the-day-back risk at all.
export function formatShortDate(dateString: string) {
  return `${dateString.slice(5, 7)}/${dateString.slice(8, 10)}`;
}

// Short "$1,234.56" used in activity-log entries. Five action files each
// had their own `$${amount.toFixed(2)}` reimplementation of this; the "/mo"
// suffix (categories, source transfers) is the only variation any of them
// actually needed.
export function logMoney(amount: number, suffix: string = "") {
  return `${formatMoney(amount)}${suffix}`;
}

export type ParseMoneyOptions = {
  // Reject zero and negatives — for fields where an amount must be a real
  // positive figure (a source transfer, a forecast entry, a transfer leg).
  positive?: boolean;
  // Treat a missing/blank field as this rather than an error.
  fallback?: number;
};

// Every action used to do a bare `Number(formData.get(...))`, which turns
// "" into 0 and "abc" into NaN — so an empty amount silently created a $0
// transaction, and a non-numeric one wrote NaN into a numeric column and
// surfaced as a raw Postgres error instead of a validation message.
export function parseMoney(
  value: FormDataEntryValue | null,
  options: ParseMoneyOptions = {},
): { amount: number } | { error: string } {
  const raw = typeof value === "string" ? value.trim() : "";

  if (raw === "") {
    if (options.fallback !== undefined) return { amount: options.fallback };
    return { error: "Enter an amount." };
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return { error: "Enter a valid amount." };
  if (options.positive && amount <= 0) return { error: "Enter an amount greater than zero." };

  // Money columns are numeric(12,2); anything finer is the user's typing,
  // not a real cent value, and would round on write anyway.
  return { amount: Math.round(amount * 100) / 100 };
}
