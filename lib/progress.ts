// v_spending_by_category.amount is the raw signed sum (negative = money
// out); flip it to a positive "spent" magnitude for display/comparison.
export function spentFromRawAmount(rawAmount: number | null) {
  return rawAmount ? -rawAmount : 0;
}

export function computeProgress({ total, spent }: { total: number; spent: number }) {
  const remaining = total - spent;
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((spent / total) * 100))) : 0;
  const over = spent > total && total > 0;
  return { spent, remaining, pct, over };
}
