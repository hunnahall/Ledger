export const SOURCE_TYPES = [
  "budget",
  "reimbursement",
  "fund",
  "float",
  "sinking_fund",
  "income",
] as const;
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

  if (type === "reimbursement" && !depositDate) {
    return { ok: false, error: "Enter the deposit date." };
  }

  return { ok: true };
}
