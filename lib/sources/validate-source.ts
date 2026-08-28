export const SOURCE_TYPES = [
  "budget",
  "reimbursement",
  "fund",
  "float",
  "sinking_fund",
  "income",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// These 4 types are auto-provisioned singletons (one per user, created at
// signup) rather than user-created buckets — they can't be created,
// archived, or duplicated by hand.
export const RESERVED_SOURCE_TYPES = ["budget", "float", "sinking_fund", "income"] as const;

export function isReservedSourceType(type: string): boolean {
  return (RESERVED_SOURCE_TYPES as readonly string[]).includes(type);
}

export const RESERVED_SOURCE_TYPE_MESSAGES: Record<string, string> = {
  budget: "Budget sources are managed automatically per budget.",
  float: "The Float source is a single default and can't be created by hand.",
  sinking_fund: "The Sinking Fund source is a single default and can't be created by hand.",
  income: "The Income source is a single default and can't be created by hand.",
};

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
