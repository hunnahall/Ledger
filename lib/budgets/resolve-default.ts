export type BudgetLike = { id: string; is_current: boolean };

export function resolveDefaultBudgetId(budgets: BudgetLike[]): string | null {
  const current = budgets.find((b) => b.is_current);
  if (current) return current.id;
  return budgets[0]?.id ?? null;
}
