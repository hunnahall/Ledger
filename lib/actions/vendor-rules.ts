"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/transactions/normalize-merchant";
import { learnVendorRule } from "@/lib/actions/transactions";

export async function createVendorRule(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const description = String(formData.get("merchant") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (!description) return { error: "Enter a merchant name." };
  if (!categoryId) return { error: "Choose a category." };

  const merchantNormalized = normalizeMerchant(description);
  if (!merchantNormalized) return { error: "Enter a merchant name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await learnVendorRule(supabase, user.id, merchantNormalized, categoryId, null);

  revalidatePath("/settings");
  return null;
}

export async function deleteVendorRule(
  ruleId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_category_rules").delete().eq("id", ruleId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return null;
}
