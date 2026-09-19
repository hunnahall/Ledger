import { spentFromRawAmount } from "@/lib/progress";

export function computeDashboardTotals({
  income,
  otherInflow,
  budgetedOutflowRaw,
  otherOutflowRaw,
  categorizedIncome,
}: {
  income: number;
  otherInflow: number;
  budgetedOutflowRaw: number | null;
  otherOutflowRaw: number | null;
  // Positive-amount, Budget-sourced transactions carrying a category
  // instead of the is_income flag (v_budget_category_income) — a paycheck
  // or reimbursement filed under a category rather than marked Income.
  // Already raw-positive (unlike budgetedOutflowRaw/otherOutflowRaw), so
  // it's added directly rather than run through spentFromRawAmount.
  // Already counted once in totalNet via otherInflow (which has no
  // source/category restriction), so it's added to budgetNet only.
  categorizedIncome: number;
}) {
  const budgetedOutflow = spentFromRawAmount(budgetedOutflowRaw);
  const otherOutflow = spentFromRawAmount(otherOutflowRaw);
  const budgetNet = income - budgetedOutflow + categorizedIncome;
  const totalNet = income + otherInflow - budgetedOutflow - otherOutflow;
  return {
    income,
    otherInflow,
    budgetedOutflow,
    otherOutflow,
    categorizedIncome,
    budgetNet,
    totalNet,
  };
}
