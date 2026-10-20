// The Budget page's bullet bar: spending against a category's budget on a
// fixed 0-130% scale, so every row's budget tick lands in the same place
// down the column. Color comes from categoryStatus; the pace tick never
// changes it.

import { categoryStatus } from "@/lib/budget/category-status";

/** The scale runs to this multiple of the budget. */
export const BULLET_DOMAIN = 1.3;

export type BulletTone = "accent" | "warning" | "danger";

export type Bullet = {
  /** Fill width as a share of the bar (0-1), capped at the end of the scale. */
  fill: number;
  /** Where the budget tick sits (0-1): always 1 / 1.3. */
  budgetMark: number;
  /** Where an even pace would be today (0-1), or null outside the current month. */
  paceMark: number | null;
  tone: BulletTone;
  /** Spent as a share of the budget, rounded to a whole percent. */
  percent: number;
};

/** Null when the budget is 0: there's nothing to measure against, so no bar. */
export function bullet({
  spent,
  budget,
  monthProgress,
}: {
  spent: number;
  budget: number;
  /** dayOfMonth / daysInMonth for the current month; null for any other month. */
  monthProgress: number | null;
}): Bullet | null {
  if (Math.round(budget * 100) <= 0) return null;
  const status = categoryStatus(spent, budget);
  const tone: BulletTone = status === "over" ? "danger" : status === "on_track" ? "accent" : "warning";
  const ratio = Math.max(0, spent / budget);
  return {
    fill: Math.min(ratio, BULLET_DOMAIN) / BULLET_DOMAIN,
    budgetMark: 1 / BULLET_DOMAIN,
    paceMark: monthProgress === null ? null : Math.min(Math.max(monthProgress, 0), 1) / BULLET_DOMAIN,
    tone,
    percent: Math.round(ratio * 100),
  };
}
