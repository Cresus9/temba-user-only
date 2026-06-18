// deno-lint-ignore-file no-explicit-any
/**
 * finalize-order
 *
 * Called by QStash (from stripe-webhook or pawapay-webhook).
 * Runs admin_finalize_payment RPC to create tickets and complete the order.
 * Returns 5xx on failure — QStash will retry up to 5×.
 *
 * Auth: X-Finalize-Secret header (forwarded by QStash).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import {
  verifyFinalizeSecret,
  redisSet,
  paymentStatusKey,
  PAYMENT_STATUS_TTL,
} from "../_shared/upstash.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // ── Auth check ────────────────────────────────────────────────────────────
  if (!verifyFinalizeSecret(req)) {
    console.error("[finalize-order] unauthorized");
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { payment_id, provider } = body as { payment_id: string; provider?: string };

    if (!payment_id) {
      return json({ error: "payment_id is required" }, 400);
    }

    console.log("[finalize-order] processing:", payment_id, "provider:", provider);

    // ── Idempotency guard: check order status before calling RPC ─────────
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, status, order_id")
      .eq("id", payment_id)
      .maybeSingle();

    if (fetchErr || !payment) {
      console.error("[finalize-order] payment not found:", payment_id, fetchErr);
      // Return 5xx → QStash will retry
      return json({ error: "Payment not found" }, 500);
    }

    if (payment.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("status")
        .eq("id", payment.order_id)
        .maybeSingle();

      if (order?.status === "COMPLETED") {
        console.log("[finalize-order] order already completed, skipping:", payment.order_id);
        await redisSet(paymentStatusKey(payment_id), "finalized", PAYMENT_STATUS_TTL);
        return json({ ok: true, note: "already finalized" });
      }
    }

    // ── Call the idempotent finalization RPC ──────────────────────────────
    const { error: rpcErr } = await supabase.rpc("admin_finalize_payment", {
      p_payment_id: payment_id,
    });

    if (rpcErr) {
      console.error("[finalize-order] RPC error:", rpcErr);
      // Return 5xx so QStash retries
      return json({ error: rpcErr.message }, 500);
    }

    // ── Mark finalized in Redis ───────────────────────────────────────────
    await redisSet(paymentStatusKey(payment_id), "finalized", PAYMENT_STATUS_TTL);

    console.log("[finalize-order] finalized:", payment_id);
    return json({ ok: true, payment_id });

  } catch (err: any) {
    console.error("[finalize-order] uncaught error:", err);
    // 5xx causes QStash to retry
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
