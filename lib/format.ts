export function formatMoney(amount: number, decimalPlaces: number = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);
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
