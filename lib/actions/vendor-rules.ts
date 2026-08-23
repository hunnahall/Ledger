"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { learnVendorRule } from "@/lib/actions/transactions";

export async function createVendorRule(formData: FormData) {
  const description = String(formData.get("merchant") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (!description || !categoryId) return;

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await learnVendorRule(supabase, user.id, merchantNormalized, categoryId, null);

  revalidatePath("/settings");
}

export async function deleteVendorRule(ruleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_category_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
