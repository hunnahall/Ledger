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

export async function updateMonthAhead(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const monthAhead = formData.get("month_ahead") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("settings")
    .update({ month_ahead: monthAhead })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (monthAhead) {
    // Turning this on only changes behavior going forward (see
    // route_income_to_fund) — anything already marked as income this
    // month from before the mode was on would otherwise just sit there
    // as a label instead of actually landing in the fund that's about to
    // be swept into the budget. One-time catch-up, current month only.
    const { error: catchUpError } = await supabase.rpc("route_current_month_income_to_fund", {
      p_user_id: user.id,
    });
    if (catchUpError) return { error: catchUpError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/sources");
  revalidatePath("/dashboard");
  return null;
}
