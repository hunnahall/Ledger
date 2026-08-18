import { spentFromRawAmount } from "@/lib/progress";

export function computeDashboardTotals({
  inflow,
  budgetedOutflowRaw,
  otherOutflowRaw,
}: {
  inflow: number;
  budgetedOutflowRaw: number | null;
  otherOutflowRaw: number | null;
}) {
  const budgetedOutflow = spentFromRawAmount(budgetedOutflowRaw);
  const otherOutflow = spentFromRawAmount(otherOutflowRaw);
  const totalNet = inflow - budgetedOutflow - otherOutflow;
  return { inflow, budgetedOutflow, otherOutflow, totalNet };
}
