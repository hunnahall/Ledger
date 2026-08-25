export const SOURCE_TYPES = ["budget", "past_payment", "future_repayment", "fund", "float"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type SourceInput = {
  type: string;
  depositDate: string | null;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateSourceInput({ type, depositDate }: SourceInput): ValidationResult {
  if (!SOURCE_TYPES.includes(type as SourceType)) {
    return { ok: false, error: "Not a valid source type." };
  }

  if ((type === "past_payment" || type === "future_repayment") && !depositDate) {
    return {
      ok: false,
      error:
        type === "past_payment"
          ? "Enter the deposit date."
          : "Enter the expected deposit date.",
    };
  }

  return { ok: true };
}
