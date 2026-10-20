export type SinkingFrequency = "quarterly" | "semiannual" | "annual";
export type SinkingContributionType = "frequency" | "goal";

const MONTHS_PER_PERIOD: Record<SinkingFrequency, number> = {
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export const SINKING_FREQUENCIES: SinkingFrequency[] = ["quarterly", "semiannual", "annual"];

export const SINKING_FREQUENCY_LABELS: Record<SinkingFrequency, string> = {
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  annual: "Annual",
};

export function monthlySinkingAmount(amount: number, frequency: SinkingFrequency): number {
  return amount / MONTHS_PER_PERIOD[frequency];
}

// Goal mode: what's left to save (target minus what's already in the linked
// fund) spread over the months remaining until the target date. Floored at
// 0 so an already-met goal doesn't show a negative monthly amount.
export function goalMonthlyAmount(
  targetAmount: number,
  alreadySaved: number,
  monthsRemaining: number,
): number {
  return Math.max(0, (targetAmount - alreadySaved) / monthsRemaining);
}
