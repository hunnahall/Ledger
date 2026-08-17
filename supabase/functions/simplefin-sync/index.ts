// Syncs one (manual "Sync now") or all (cron) SimpleFin bank connections.
//
// Invocation:
//   - Manual: caller's own JWT, body { connection_id }. The connection must
//     belong to the caller (enforced by querying it through an RLS-scoped
//     client).
//   - Cron: service-role JWT, no body (or {} ) — syncs every active
//     connection across all users. Only the service_role JWT is allowed to
//     omit connection_id.
//
// SimpleFin has no mTLS/cert requirement — the access URL itself carries
// HTTP Basic Auth credentials (https://user:pass@bridge.simplefin.org/...).
// We never let fetch() see the embedded userinfo (unreliable across
// runtimes); it's parsed out and sent as an explicit Authorization header.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !/^\d+$/.test(token))
    .join(" ")
    .trim();
}

function decodeJwtRole(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.role ?? null;
  } catch {
    return null;
  }
}

function splitAccessUrl(accessUrl: string): { requestBase: string; authHeader: string } {
  const url = new URL(accessUrl);
  const authHeader = "Basic " + btoa(`${url.username}:${url.password}`);
  url.username = "";
  url.password = "";
  return { requestBase: url.toString().replace(/\/$/, ""), authHeader };
}

type SimplefinTransaction = {
  id: string;
  posted: number;
  amount: string;
  description: string;
  pending?: boolean;
  transacted_at?: number;
};

type SimplefinAccount = {
  id: string;
  name: string;
  balance: string;
  "available-balance"?: string;
  "balance-date": number;
  transactions?: SimplefinTransaction[];
};

async function syncConnection(
  serviceClient: ReturnType<typeof createClient>,
  connection: { id: string; user_id: string; last_synced_at: string | null },
  triggeredBy: "manual" | "cron",
) {
  const startedAt = new Date().toISOString();
  let transactionsFetched = 0;
  let transactionsNew = 0;

  try {
    const { data: accessUrl, error: rpcError } = await serviceClient.rpc(
      "get_bank_connection_access_url",
      { p_connection_id: connection.id },
    );
    if (rpcError || !accessUrl) {
      throw new Error(rpcError?.message ?? "no access URL stored for this connection");
    }

    const { requestBase, authHeader } = splitAccessUrl(accessUrl as string);

    const params = new URLSearchParams({ pending: "1" });
    if (connection.last_synced_at) {
      // One day of overlap so late-posting transactions aren't missed.
      const startDate = Math.floor(new Date(connection.last_synced_at).getTime() / 1000) - 86400;
      params.set("start-date", String(startDate));
    }

    const response = await fetch(`${requestBase}/accounts?${params.toString()}`, {
      headers: { Authorization: authHeader },
    });
    if (!response.ok) {
      throw new Error(`SimpleFin returned HTTP ${response.status}`);
    }
    const payload = await response.json();
    const accounts: SimplefinAccount[] = payload.accounts ?? [];
    const errlist: unknown[] = payload.errlist ?? [];

    for (const acct of accounts) {
      const { data: accountRow, error: acctError } = await serviceClient
        .from("accounts")
        .upsert(
          {
            user_id: connection.user_id,
            bank_connection_id: connection.id,
            provider_account_id: acct.id,
            account_name: acct.name,
            account_type: "checking",
            is_manual: false,
            status: "active",
            current_balance: Number(acct.balance),
            available_balance: acct["available-balance"] != null
              ? Number(acct["available-balance"])
              : null,
          },
          { onConflict: "bank_connection_id,provider_account_id" },
        )
        .select("id")
        .single();

      if (acctError || !accountRow) {
        throw new Error(acctError?.message ?? "failed to upsert account");
      }

      const transactions = acct.transactions ?? [];
      transactionsFetched += transactions.length;
      if (transactions.length === 0) continue;

      const rows = transactions.map((tx) => ({
        user_id: connection.user_id,
        account_id: accountRow.id,
        provider_transaction_id: tx.id,
        posted_date: new Date((tx.posted || tx.transacted_at || Date.now() / 1000) * 1000)
          .toISOString()
          .slice(0, 10),
        amount: Number(tx.amount),
        description: tx.description,
        merchant_normalized: normalizeMerchant(tx.description),
        status: tx.pending ? "pending" : "posted",
      }));

      const { error: txError } = await serviceClient
        .from("transactions")
        .upsert(rows, { onConflict: "account_id,provider_transaction_id" });
      if (txError) throw new Error(txError.message);
    }

    // Auto-categorize anything still uncategorized using this user's
    // learned vendor rules (also retroactively covers older uncategorized
    // rows if a rule was learned since the last sync).
    const { data: uncategorized } = await serviceClient
      .from("transactions")
      .select("id, merchant_normalized")
      .eq("user_id", connection.user_id)
      .is("category_id", null)
      .eq("is_transfer", false)
      .not("merchant_normalized", "is", null);

    for (const txn of uncategorized ?? []) {
      const { data: rule } = await serviceClient
        .from("vendor_category_rules")
        .select("category_id, source_id")
        .eq("user_id", connection.user_id)
        .eq("merchant_normalized", txn.merchant_normalized)
        .maybeSingle();
      if (rule) {
        await serviceClient
          .from("transactions")
          .update({ category_id: rule.category_id, source_id: rule.source_id })
          .eq("id", txn.id);
        transactionsNew += 1;
      }
    }

    await serviceClient
      .from("bank_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        status: errlist.length > 0 ? "error" : "active",
      })
      .eq("id", connection.id);

    await serviceClient.from("sync_log").insert({
      user_id: connection.user_id,
      bank_connection_id: connection.id,
      triggered_by: triggeredBy,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: errlist.length > 0 ? "error" : "success",
      transactions_fetched: transactionsFetched,
      transactions_new: transactionsNew,
      error_message: errlist.length > 0 ? JSON.stringify(errlist) : null,
    });

    return {
      connection_id: connection.id,
      status: errlist.length > 0 ? "error" : "success",
      transactionsFetched,
      error: errlist.length > 0 ? JSON.stringify(errlist) : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await serviceClient.from("bank_connections").update({ status: "error" }).eq(
      "id",
      connection.id,
    );
    await serviceClient.from("sync_log").insert({
      user_id: connection.user_id,
      bank_connection_id: connection.id,
      triggered_by: triggeredBy,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "error",
      error_message: message,
    });
    return { connection_id: connection.id, status: "error", error: message };
  }
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const role = decodeJwtRole(authHeader);
  const body = await req.json().catch(() => ({}));
  const connectionId: string | undefined = body.connection_id;

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (!connectionId) {
    if (role !== "service_role") {
      return new Response(
        JSON.stringify({ error: "connection_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const { data: connections, error } = await serviceClient
      .from("bank_connections")
      .select("id, user_id, last_synced_at")
      .eq("status", "active");
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const results = [];
    for (const connection of connections ?? []) {
      results.push(await syncConnection(serviceClient, connection, "cron"));
    }
    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Manual sync of one connection: verify ownership via an RLS-scoped
  // client using the caller's own JWT before touching anything.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader ?? "" } },
  });
  const { data: connection, error: ownError } = await userClient
    .from("bank_connections")
    .select("id, user_id, last_synced_at")
    .eq("id", connectionId)
    .single();

  if (ownError || !connection) {
    return new Response(JSON.stringify({ error: "connection not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await syncConnection(serviceClient, connection, "manual");
  return new Response(JSON.stringify(result), {
    status: result.status === "error" ? 502 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
