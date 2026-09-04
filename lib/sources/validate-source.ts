export const SOURCE_TYPES = [
  "budget",
  "reimbursement",
  "fund",
  "float",
  "sinking_fund",
  "income",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// Display names for the source_type enum. Kept here beside SOURCE_TYPES so
// adding a type can't leave a label behind — SourceCard and CreateSourceForm
// each carried their own overlapping copy.
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  budget: "Budget",
  reimbursement: "Reimbursement",
  fund: "Fund",
  float: "Float",
  sinking_fund: "Sinking Fund",
  income: "Income",
};

// The two a user can actually create; the rest are auto-provisioned
// singletons (see RESERVED_SOURCE_TYPES below).
export const CREATABLE_SOURCE_TYPES = ["reimbursement", "fund"] as const;

// These 4 types are auto-provisioned singletons (one per user, created at
// signup) rather than user-created buckets — they can't be created,
// archived, or duplicated by hand.
const RESERVED_SOURCE_TYPES = ["budget", "float", "sinking_fund", "income"] as const;

export function isReservedSourceType(type: string): boolean {
  return (RESERVED_SOURCE_TYPES as readonly string[]).includes(type);
}

export const RESERVED_SOURCE_TYPE_MESSAGES: Record<string, string> = {
  budget: "Budget sources are managed automatically per budget.",
  float: "The Float source is a single default and can't be created by hand.",
  sinking_fund: "The Sinking Fund source is a single default and can't be created by hand.",
  income: "The Income source is a single default and can't be created by hand.",
};

type SourceInput = {
  type: string;
  depositDate: string | null;
};

type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateSourceInput({ type, depositDate }: SourceInput): ValidationResult {
  if (!SOURCE_TYPES.includes(type as SourceType)) {
    return { ok: false, error: "Not a valid source type." };
  }

  if (type === "reimbursement" && !depositDate) {
    return { ok: false, error: "Enter the deposit date." };
  }

  return { ok: true };
}
