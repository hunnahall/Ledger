type VendorRuleCandidate = { merchant_normalized: string };

// A rule's pattern only has to appear somewhere in the transaction's
// normalized description, not equal it outright — so a rule for "target"
// still fires on "tsx target checkout" (a bank often prefixes/suffixes the
// merchant with terminal codes, locations, etc.). When more than one rule
// matches, the longest pattern wins — a specific multi-word rule should
// beat a shorter, more generic one covering the same transaction.
export function findMatchingRule<T extends VendorRuleCandidate>(
  rules: T[],
  merchantNormalized: string,
): T | null {
  let best: T | null = null;
  for (const rule of rules) {
    if (!rule.merchant_normalized || !merchantNormalized.includes(rule.merchant_normalized)) continue;
    if (!best || rule.merchant_normalized.length > best.merchant_normalized.length) {
      best = rule;
    }
  }
  return best;
}
