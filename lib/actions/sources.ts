"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SOURCE_TYPES = [
  "general",
  "current_budget",
  "advance",
  "reimbursement",
  "sinking_fund",
] as const;

export async function createSource(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "general");
  const isReimbursement = formData.get("is_reimbursement") === "on";
  const balance = Number(formData.get("balance") ?? 0);
  if (!name) return;
  if (!SOURCE_TYPES.includes(type as (typeof SOURCE_TYPES)[number])) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("sources").insert({
    user_id: user.id,
    name,
    type,
    is_reimbursement: isReimbursement,
    balance,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function archiveSource(sourceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function createContribution(sourceId: string, formData: FormData) {
  const amount = Number(formData.get("amount") ?? 0);
  const targetMonthInput = String(formData.get("target_month") ?? "");
  if (!amount || !targetMonthInput) return;

  const targetMonth = `${targetMonthInput}-01`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("source_contributions").insert({
    user_id: user.id,
    source_id: sourceId,
    amount,
    target_month: targetMonth,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function togglePullForward(
  contributionId: string,
  currentlyPulled: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("source_contributions")
    .update({ pulled_forward: !currentlyPulled })
    .eq("id", contributionId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}

export async function deleteContribution(contributionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("source_contributions")
    .delete()
    .eq("id", contributionId);
  if (error) throw new Error(error.message);

  revalidatePath("/sources");
}
