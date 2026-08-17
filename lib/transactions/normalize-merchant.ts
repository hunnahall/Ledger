export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !/^\d+$/.test(token))
    .join(" ")
    .trim();
}
