import { spentFromRawAmount } from "@/lib/progress";

export function computeDashboardTotals({
  income,
  otherInflows,
  expenseRaw,
  otherOutflowsRaw,
  categorizedIncome,
  allocation,
}: {
  income: number;
  otherInflows: number;
  expenseRaw: number | null;
  otherOutflowsRaw: number | null;
  // Positive-amount, Budget-sourced transactions carrying a category
  // instead of the is_income flag (v_budget_category_income) — a paycheck
  // or reimbursement filed under a category rather than marked Income.
  // Already raw-positive (unlike expenseRaw/otherOutflowsRaw), so
  // it's added directly rather than run through spentFromRawAmount.
  categorizedIncome: number;
  // The month's total budget commitment (categories + sinking expenses +
  // source transfers — see getBudgetRateData's identical calc) — what
  // Budget Net measures spending against isn't what actually came in as
  // income this month, it's what the budget itself allocated.
  allocation: number;
}) {
  const expense = spentFromRawAmount(expenseRaw);
  const otherOutflows = spentFromRawAmount(otherOutflowsRaw);
  const budgetNet = allocation - expense + categorizedIncome;
  // otherInflows already contains categorizedIncome (v_inflow_outflow counts
  // every positive, non-Income amount with a Source), so it is never
  // added a second time here — categorizedIncome only feeds budgetNet.
  const inflows = income + otherInflows;
  const outflows = expense + otherOutflows;
  const cashFlow = inflows - outflows;
  return {
    income,
    otherInflows,
    inflows,
    expense,
    otherOutflows,
    outflows,
    categorizedIncome,
    allocation,
    budgetNet,
    cashFlow,
  };
}
