"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMPORT_DAYS, daysBetween } from "@/lib/sources/import-range";

async function claimAccessUrl(setupToken: string): Promise<string> {
  let claimUrl: string;
  try {
    claimUrl = atob(setupToken.trim());
  } catch {
    throw new Error("That doesn't look like a valid setup token.");
  }
  if (!/^https?:\/\//.test(claimUrl)) {
    throw new Error("That doesn't look like a valid setup token.");
  }

  const response = await fetch(claimUrl, { method: "POST" });
  if (response.status === 403) {
    throw new Error("This setup token was already used or has expired — generate a new one.");
  }
  if (!response.ok) {
    throw new Error(`SimpleFin claim failed (HTTP ${response.status}).`);
  }
  const accessUrl = (await response.text()).trim();
  if (!/^https?:\/\//.test(accessUrl)) {
    throw new Error("SimpleFin returned an unexpected response.");
  }
  return accessUrl;
}

export async function connectBankConnection(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const setupToken = String(formData.get("setup_token") ?? "").trim();
  if (!setupToken) return { error: "Paste a setup token." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let accessUrl: string;
  try {
    accessUrl = await claimAccessUrl(setupToken);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to claim setup token." };
  }

  const { data: connectionId, error } = await supabase.rpc("store_bank_connection_secret", {
    p_access_url: accessUrl,
  });
  if (error) return { error: error.message };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/simplefin-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ connection_id: connectionId }),
    },
  ).catch(() => {
    // Initial sync failing shouldn't block the connection from being saved;
    // the user can retry with "Sync now" on the Accounts page.
  });

  revalidatePath("/accounts");
  revalidatePath("/settings");
  return null;
}

async function invokeSync(
  connectionId: string,
  extra?: Record<string, string>,
): Promise<{ transactionsFetched?: number }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/simplefin-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ connection_id: connectionId, ...extra }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Sync failed (HTTP ${response.status}).`);
  }
  return body;
}

export async function syncBankConnection(
  connectionId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  try {
    await invokeSync(connectionId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed." };
  }

  revalidatePath("/accounts");
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return null;
}

// Backfills one bank connection over an explicit date range (as opposed to
// syncBankConnection's rolling window since last sync) — see the "Import"
// control on the Accounts page. Dedup is handled entirely server-side: the
// edge function upserts transactions keyed on (account_id,
// provider_transaction_id), so re-importing an overlapping range never
// creates duplicates, it just re-upserts the same rows.
export async function importBankConnectionRange(
  connectionId: string,
  _prevState: { error: string; count?: undefined } | { error?: undefined; count: number } | null,
  formData: FormData,
): Promise<{ error: string; count?: undefined } | { error?: undefined; count: number }> {
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  if (!startDate || !endDate || endDate < startDate) {
    return { error: "Choose a valid date range." };
  }
  const days = daysBetween(startDate, endDate) ?? 0;
  if (days > MAX_IMPORT_DAYS) {
    return { error: `Import range must be ${MAX_IMPORT_DAYS} days or fewer (chose ${days}).` };
  }

  let result: { transactionsFetched?: number };
  try {
    result = await invokeSync(connectionId, { start_date: startDate, end_date: endDate });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed." };
  }

  revalidatePath("/accounts");
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { count: result.transactionsFetched ?? 0 };
}

export async function disconnectBankConnection(
  connectionId: string,
  _prevState: { error: string } | null,
  _formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_bank_connection", {
    p_connection_id: connectionId,
  });
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/settings");
  return null;
}
