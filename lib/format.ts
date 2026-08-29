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
