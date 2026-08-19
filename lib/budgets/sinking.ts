export type SinkingFrequency = "quarterly" | "semiannual" | "annual";

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
