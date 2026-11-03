"use server";

import { requireUser } from "@/lib/supabase/auth";
import { getUnsourcedCount } from "@/lib/queries/transactions";

// The Transactions nav badge asks for its own count (see review-count.tsx):
// a client navigation reuses the already-rendered (app) layout, so the
// layout's count alone goes stale.
export async function fetchReviewCount(): Promise<number> {
  await requireUser();
  return getUnsourcedCount();
}
