type SourceLike = { type: string };

export function groupSourcesByType<T extends SourceLike>(sources: T[]) {
  const groups = {
    budget: [] as T[],
    reimbursement: [] as T[],
    fund: [] as T[],
  };

  for (const source of sources) {
    if (source.type === "reimbursement") groups.reimbursement.push(source);
    else if (source.type === "fund") groups.fund.push(source);
    else groups.budget.push(source);
  }

  return groups;
}
