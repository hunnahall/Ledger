// The Transfers category is a plain row with a $0 monthly amount. Money
// moving to the Sinking Fund or a Source Transfer is spent from it, so its
// real budget is the Sinking Expenses plus Source Transfers total. Matched
// by name, since categories carry no "special" marker; renaming it breaks
// the override (Dashboard and Budget page both use this).
export const TRANSFERS_CATEGORY_NAME = "Transfers";

export type CategoryStatus = "on_track" | "near_limit" | "spent" | "over";

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  on_track: "On track",
  near_limit: "Near limit",
  spent: "Spent",
  over: "Over",
};

// On track under 90% of the budget, Near limit from 90% up to 100%, Spent at
// exactly 100% (to the cent), Over past it. Spending against a $0 budget is
// Over; nothing spent is always On track.
export function categoryStatus(spent: number, budget: number): CategoryStatus {
  const spentCents = Math.round(spent * 100);
  const budgetCents = Math.round(budget * 100);
  if (spentCents <= 0) return "on_track";
  if (budgetCents <= 0 || spentCents > budgetCents) return "over";
  if (spentCents === budgetCents) return "spent";
  return spentCents >= budgetCents * 0.9 ? "near_limit" : "on_track";
}

type CategoryInput = { id: string; name: string; monthly_amount: number; spent: number };

export type CategoryLine = {
  id: string;
  name: string;
  /** The budget shown and measured against (Transfers gets the override). */
  budget: number;
  spent: number;
  left: number;
  status: CategoryStatus;
  isTransfers: boolean;
};

// Rows and totals for the Budget page's Categories table. With the Transfers
// override in place, the Budget column totals to the full allocation
// (categories + sinking expenses + source transfers).
export function categoryLines(categories: CategoryInput[], transfersMonthlyTotal: number) {
  const lines: CategoryLine[] = categories.map((c) => {
    const isTransfers = c.name === TRANSFERS_CATEGORY_NAME;
    const budget = isTransfers ? transfersMonthlyTotal : c.monthly_amount;
    return {
      id: c.id,
      name: c.name,
      budget,
      spent: c.spent,
      left: budget - c.spent,
      status: categoryStatus(c.spent, budget),
      isTransfers,
    };
  });
  const budget = lines.reduce((sum, l) => sum + l.budget, 0);
  const spent = lines.reduce((sum, l) => sum + l.spent, 0);
  const over = lines.filter((l) => l.status === "over");
  return { lines, totals: { budget, spent, left: budget - spent }, over };
}
