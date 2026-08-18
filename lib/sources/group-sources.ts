export type SourceLike = { type: string };

export function groupSourcesByType<T extends SourceLike>(sources: T[]) {
  const groups = {
    budget: [] as T[],
    pastPayment: [] as T[],
    futureRepayment: [] as T[],
    fund: [] as T[],
  };

  for (const source of sources) {
    if (source.type === "past_payment") groups.pastPayment.push(source);
    else if (source.type === "future_repayment") groups.futureRepayment.push(source);
    else if (source.type === "fund") groups.fund.push(source);
    else groups.budget.push(source);
  }

  return groups;
}
