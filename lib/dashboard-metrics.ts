import { spentFromRawAmount } from "@/lib/progress";

export function computeDashboardTotals({
  income,
  otherInflow,
  budgetedOutflowRaw,
  otherOutflowRaw,
  categorizedIncome,
  totalAllocation,
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
  categorizedIncome: number;
  // The month's total budget commitment (categories + sinking expenses +
  // source transfers — see getBudgetRateData's identical calc) — what
  // Budget Net measures spending against isn't what actually came in as
  // income this month, it's what the budget itself allocated.
  totalAllocation: number;
}) {
  const budgetedOutflow = spentFromRawAmount(budgetedOutflowRaw);
  const otherOutflow = spentFromRawAmount(otherOutflowRaw);
  const budgetNet = totalAllocation - budgetedOutflow + categorizedIncome;
  const totalNet = income + otherInflow - budgetedOutflow - otherOutflow;
  return {
    income,
    otherInflow,
    budgetedOutflow,
    otherOutflow,
    categorizedIncome,
    totalAllocation,
    budgetNet,
    totalNet,
  };
}
