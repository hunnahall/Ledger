import { spentFromRawAmount } from "@/lib/progress";

export function computeDashboardTotals({
  income,
  otherInflow,
  budgetedOutflowRaw,
  otherOutflowRaw,
}: {
  income: number;
  otherInflow: number;
  budgetedOutflowRaw: number | null;
  otherOutflowRaw: number | null;
}) {
  const budgetedOutflow = spentFromRawAmount(budgetedOutflowRaw);
  const otherOutflow = spentFromRawAmount(otherOutflowRaw);
  const budgetNet = income - budgetedOutflow;
  const totalNet = income + otherInflow - budgetedOutflow - otherOutflow;
  return { income, otherInflow, budgetedOutflow, otherOutflow, budgetNet, totalNet };
}
