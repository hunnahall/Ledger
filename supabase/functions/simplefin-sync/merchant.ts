// Mirrors lib/transactions/normalize-merchant.ts. The Deno edge runtime
// can't import from the Next app's module graph, so this is a deliberate
// second copy. It lives beside index.ts rather than in a shared folder so
// the same relative import works under both the Supabase CLI and a direct
// function deploy, which flatten the bundle differently.
export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !/^\d+$/.test(token))
    .join(" ")
    .trim();
}
