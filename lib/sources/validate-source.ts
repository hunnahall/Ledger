export const SOURCE_TYPES = ["budget", "past_payment", "future_repayment", "fund"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type SourceInput = {
  type: string;
  fundIds: string[];
  depositDate: string | null;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateSourceInput({ type, fundIds, depositDate }: SourceInput): ValidationResult {
  if (!SOURCE_TYPES.includes(type as SourceType)) {
    return { ok: false, error: "Not a valid source type." };
  }

  if (type === "fund") {
    if (fundIds.length === 0) {
      return { ok: false, error: "Select a fund for this source." };
    }
    if (fundIds.length > 1) {
      return { ok: false, error: "Only one fund can be linked to a source for now." };
    }
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
