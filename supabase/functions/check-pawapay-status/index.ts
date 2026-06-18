// deno-lint-ignore-file no-explicit-any
/**
 * check-pawapay-status
 *
 * QStash safety net — runs T+10 min after create-pawapay-payment.
 * If the PawaPay webhook already arrived (Redis key exists), this is a no-op.
 * Otherwise it polls the PawaPay API and, if the payment is terminal,
 * updates the DB and enqueues finalize-order.
 *
 * Auth: X-Finalize-Secret header (forwarded by QStash).
 * On 5xx QStash retries: T+10 min → T+30 min → T+2 h → T+24 h (4 retries).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import {
  verifyFinalizeSecret,
  redisGet,
  redisSetNx,
  redisSet,
  qstashPublish,
  webhookDedupKey,
  paymentStatusKey,
  PAYMENT_STATUS_TTL,
  WEBHOOK_DEDUP_TTL,
} from "../_shared/upstash.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const PAWAPAY_BASE: Record<string, string> = {
  production: "https://api.pawapay.io",
  sandbox:    "https://api.sandbox.pawapay.io",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  if (!verifyFinalizeSecret(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey        = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const finalizeSecret = Deno.env.get("FINALIZE_ORDER_SECRET") ?? "";
  const pawapayKey     = Deno.env.get("PAWAPAY_API_KEY");
  const mode           = Deno.env.get("PAWAPAY_MODE") ?? "production";
  const finalizeUrl    = `${supabaseUrl}/functions/v1/finalize-order`;

  if (!pawapayKey) {
    console.error("[check-pawapay-status] PAWAPAY_API_KEY not set");
    return json({ error: "PAWAPAY_API_KEY not set" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { payment_id, deposit_id } = body as { payment_id: string; deposit_id: string };

    if (!payment_id || !deposit_id) {
      return json({ error: "payment_id and deposit_id are required" }, 400);
    }

    console.log("[check-pawapay-status] checking:", { payment_id, deposit_id });

    // ── 1. Fast path: webhook already arrived via Redis ───────────────────
    const statusKey = paymentStatusKey(payment_id);
    const cached    = await redisGet(statusKey);

    if (cached && cached !== "pending") {
      console.log("[check-pawapay-status] webhook already processed, status:", cached);
      return json({ ok: true, note: "webhook already handled", status: cached });
    }

    // ── 2. Check dedup key — if webhook arrived but Redis missed ─────────
    const dedupKey    = webhookDedupKey("pawapay", deposit_id);
    const dedupExists = await redisGet(dedupKey);

    if (dedupExists) {
      console.log("[check-pawapay-status] dedup key found, webhook processed");
      return json({ ok: true, note: "webhook already handled via dedup" });
    }

    // ── 3. Poll PawaPay API ───────────────────────────────────────────────
    const baseUrl = PAWAPAY_BASE[mode] ?? PAWAPAY_BASE.production;
    const apiRes  = await fetch(`${baseUrl}/deposits/${deposit_id}`, {
      headers: {
        Authorization: `Bearer ${pawapayKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!apiRes.ok) {
      console.error("[check-pawapay-status] PawaPay API error:", apiRes.status);
      // Return 5xx → QStash retries
      return json({ error: `PawaPay API ${apiRes.status}` }, 500);
    }

    const apiBody = await apiRes.json();
    // PawaPay returns array or single object depending on endpoint version
    const deposit = Array.isArray(apiBody) ? apiBody[0] : apiBody;
    const apiStatus = (deposit?.status ?? "").toUpperCase();

    console.log("[check-pawapay-status] PawaPay status:", apiStatus);

    // ── 4. Still PENDING — return 5xx to trigger QStash retry ────────────
    if (!["COMPLETED", "FAILED"].includes(apiStatus)) {
      console.log("[check-pawapay-status] still pending, will retry");
      return json({ note: "still pending" }, 500);
    }

    // ── 5. Terminal status — write Redis dedup + status keys ─────────────
    const normalized = apiStatus === "COMPLETED" ? "completed" : "failed";

    await redisSetNx(dedupKey, normalized, WEBHOOK_DEDUP_TTL);
    await redisSet(statusKey, normalized, PAYMENT_STATUS_TTL);

    // ── 6. Update payment in DB ──────────────────────────────────────────
    const updateFields: any = {
      status: normalized,
      updated_at: new Date().toISOString(),
    };
    if (normalized === "completed") updateFields.completed_at = new Date().toISOString();
    if (normalized === "failed")    updateFields.failed_at    = new Date().toISOString();

    await supabase.from("payments").update(updateFields).eq("id", payment_id);

    if (normalized === "failed") {
      const { data: pmt } = await supabase
        .from("payments")
        .select("order_id")
        .eq("id", payment_id)
        .maybeSingle();

      if (pmt?.order_id) {
        await supabase
          .from("orders")
          .update({ status: "CANCELLED", visible_in_history: false, updated_at: new Date().toISOString() })
          .eq("id", pmt.order_id);
      }
      return json({ ok: true, status: "failed" });
    }

    // ── 7. Enqueue finalize-order (same dedup ID as pawapay-webhook) ──────
    const queued = await qstashPublish(
      finalizeUrl,
      { payment_id, provider: "pawapay" },
      {
        dedupId: `pawapay-finalize-${payment_id}`,
        retries: 5,
        forwardHeaders: {
          "X-Finalize-Secret": finalizeSecret,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    if (!queued) {
      // Sync fallback
      const { error } = await supabase.rpc("admin_finalize_payment", { p_payment_id: payment_id });
      if (error) {
        console.error("[check-pawapay-status] RPC fallback error:", error);
        return json({ error: error.message }, 500);
      }
    }

    console.log("[check-pawapay-status] resolved:", payment_id, normalized, queued ? "queued" : "synced");
    return json({ ok: true, status: normalized, queued });

  } catch (err: any) {
    console.error("[check-pawapay-status] error:", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
