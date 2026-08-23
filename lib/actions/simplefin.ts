"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function connectBankConnection(formData: FormData) {
  const setupToken = String(formData.get("setup_token") ?? "").trim();
  if (!setupToken) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accessUrl = await claimAccessUrl(setupToken);

  const { data: connectionId, error } = await supabase.rpc("store_bank_connection_secret", {
    p_access_url: accessUrl,
  });
  if (error) throw new Error(error.message);

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

export async function syncBankConnection(connectionId: string) {
  await invokeSync(connectionId);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

const MAX_IMPORT_DAYS = 90;

// Backfills one bank connection over an explicit date range (as opposed to
// syncBankConnection's rolling window since last sync) — see the "Import"
// control on the Accounts page. Dedup is handled entirely server-side: the
// edge function upserts transactions keyed on (account_id,
// provider_transaction_id), so re-importing an overlapping range never
// creates duplicates, it just re-upserts the same rows.
export async function importBankConnectionRange(
  connectionId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  if (!startDate || !endDate || endDate < startDate) {
    throw new Error("Choose a valid date range.");
  }
  const days =
    Math.round(
      (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
        86400000,
    ) + 1;
  if (days > MAX_IMPORT_DAYS) {
    throw new Error(`Import range must be ${MAX_IMPORT_DAYS} days or fewer (chose ${days}).`);
  }

  const result = await invokeSync(connectionId, { start_date: startDate, end_date: endDate });

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return result.transactionsFetched ?? 0;
}

export async function disconnectBankConnection(connectionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_bank_connection", {
    p_connection_id: connectionId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}
