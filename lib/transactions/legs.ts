// A "leg" is the unit every dashboard figure counts: a non-split transaction,
// or one leg of a split transaction (which takes its parent's date,
// description and is_income). These predicates are the TypeScript twins of
// v_inflow_outflow and v_outflows; the two must agree (see
// ~/Drive/ProjectsDB/ledger/equations.md).

export type Leg = {
  id: string;
  postedDate: string;
  description: string;
  amount: number;
  isIncome: boolean;
  categoryId: string | null;
  sourceId: string | null;
  /** sources.type of sourceId, or null when the leg has no Source. */
  sourceType: string | null;
};

/** An expense: a negative amount from the Budget source, or carrying a Category. */
export function isExpense(leg: Leg): boolean {
  return leg.amount < 0 && (leg.sourceType === "budget" || leg.categoryId !== null);
}

/** Other outflows: every other negative amount that has a Source. */
export function isOtherOutflow(leg: Leg): boolean {
  return leg.amount < 0 && leg.sourceType !== null && !isExpense(leg);
}

export function isOutflow(leg: Leg): boolean {
  return isExpense(leg) || isOtherOutflow(leg);
}

/** Income: a positive amount flagged Income (always on the Income source). */
export function isIncome(leg: Leg): boolean {
  return leg.amount > 0 && leg.isIncome;
}

/** Other inflows: every other positive amount that has a Source. */
export function isOtherInflow(leg: Leg): boolean {
  return leg.amount > 0 && !leg.isIncome && leg.sourceId !== null;
}

export function isInflow(leg: Leg): boolean {
  return isIncome(leg) || isOtherInflow(leg);
}

/** categorizedIncome: a positive Budget-sourced amount carrying a Category. */
export function isCategorizedIncome(leg: Leg): boolean {
  return leg.amount > 0 && leg.sourceType === "budget" && leg.categoryId !== null;
}

/** Cumulative expense per day, for days 1..throughDay. */
export function cumulativeExpenseByDay(legs: Leg[], throughDay: number): number[] {
  const perDay = new Map<number, number>();
  for (const leg of legs) {
    if (!isExpense(leg)) continue;
    const day = Number(leg.postedDate.slice(8, 10));
    perDay.set(day, (perDay.get(day) ?? 0) + Math.abs(leg.amount));
  }
  let running = 0;
  const out: number[] = [];
  for (let day = 1; day <= throughDay; day++) {
    running += perDay.get(day) ?? 0;
    out.push(running);
  }
  return out;
}
