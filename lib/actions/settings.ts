"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDecimalPlaces(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const decimalPlaces = Number(formData.get("decimal_places") ?? 2);
  if (![0, 1, 2].includes(decimalPlaces)) return { error: "Not a valid number of decimal places." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("settings")
    .update({ decimal_places: decimalPlaces })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return null;
}

export async function updateRetentionDays(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const retentionDays = Number(formData.get("retention_days"));
  if (![60, 90, 120].includes(retentionDays)) return { error: "Not a valid retention period." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("settings")
    .update({ retention_days: retentionDays })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // Apply the new, possibly shorter, retention window right away rather
  // than waiting for the nightly purge.
  const { error: purgeError } = await supabase.rpc("purge_expired_data");
  if (purgeError) return { error: purgeError.message };

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return null;
}
