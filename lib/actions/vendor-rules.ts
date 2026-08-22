"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteVendorRule(ruleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_category_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
