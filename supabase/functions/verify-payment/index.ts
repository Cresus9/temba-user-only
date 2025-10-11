// supabase/functions/verify-payment/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import Stripe from "https://esm.sh/stripe@17.3.0?target=deno";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type ReqBody = {
  // Preferred:
  payment_id?: string;       // UUID of payments.id
  // Legacy fallbacks (use only if payment_id not provided):
  internal_token?: string;   // your internal payments.token
  payment_token?: string;    // could be PayDunya token or "stripe-token-*"
  order_id?: string;         // optional; we can fetch from payment
  stripe_pi?: string;        // pi_... (fallback lookup)
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase configuration missing");

    // Stripe setup (optional until we know we need it)
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" }) : null;

    const body: ReqBody = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---------- Locate the payment row ----------
    let payment: any = null;

    // 1) payment_id preferred
    if (body.payment_id) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", body.payment_id)
        .maybeSingle());
    }

    // 2) internal_token fallback
    if (!payment && body.internal_token) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("token", body.internal_token)
        .maybeSingle());
    }

    // 3) payment_token fallback
    if (!payment && body.payment_token) {
      if (body.payment_token.startsWith("stripe-token-")) {
        ({ data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("token", body.payment_token)
          .maybeSingle());
      } else {
        ({ data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("transaction_id", body.payment_token) // PayDunya token
          .maybeSingle());
      }
    }

    // 4) pi_* fallback lookup
    if (!payment && body.stripe_pi) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("stripe_payment_intent_id", body.stripe_pi)
        .maybeSingle());
    }

    if (!payment) {
      return new Response(JSON.stringify({ success: false, error: "Payment not found" }), { status: 404, headers: cors });
    }

    const paymentId = payment.id as string;
    const provider  = (payment.provider ?? "").toLowerCase();
    const orderId   = payment.order_id ?? body.order_id ?? null;
    const status    = payment.status as string;

    if (!orderId) {
      // Not fatal, but without order_id we cannot issue tickets
      console.warn("verify-payment: payment has no order_id; ticket issuance will be skipped");
    }

    // ---------- Handle STRIPE ----------
    if (provider === "stripe") {
      if (!stripe) {
        // If you ever call this for Stripe but didn't set STRIPE_SECRET_KEY
        return new Response(JSON.stringify({ success: false, error: "Stripe not configured" }), { status: 500, headers: cors });
      }

      // Terminal?
      if (["succeeded", "completed"].includes(status)) {
        // tickets should already exist; return success
        return new Response(JSON.stringify({
          success: true,
          state: "succeeded",
          provider: "stripe",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }
      if (["failed", "canceled"].includes(status)) {
        return new Response(JSON.stringify({
          success: false,
          state: status,
          provider: "stripe",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      // Pending → ask Stripe and self-heal if succeeded
      if (!payment.stripe_payment_intent_id) {
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          message: "Awaiting PaymentIntent creation",
          provider: "stripe",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      if (intent.status === "succeeded") {
        // Self-heal: finalize idempotently via SQL function
        const { error: rpcErr } = await supabase.rpc("admin_finalize_payment", { p_payment_id: paymentId });
        if (rpcErr) console.error("admin_finalize_payment error:", rpcErr);

        return new Response(JSON.stringify({
          success: true,
          state: "succeeded",
          provider: "stripe",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      if (["processing", "requires_action", "requires_confirmation"].includes(intent.status)) {
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          provider: "stripe",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      // requires_payment_method or canceled
      return new Response(JSON.stringify({
        success: false,
        state: intent.status,
        provider: "stripe",
        payment_id: paymentId,
        order_id: orderId
      }), { headers: cors });
    }

    // ---------- Handle PAYDUNYA ----------
    if (provider === "paydunya") {
      // Only now require PayDunya env:
      const paydunyaMode       = Deno.env.get("PAYDUNYA_MODE") || "live";
      const paydunyaMasterKey  = Deno.env.get("PAYDUNYA_MASTER_KEY");
      const paydunyaPrivateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY");
      const paydunyaPublicKey  = Deno.env.get("PAYDUNYA_PUBLIC_KEY");
      const paydunyaToken      = Deno.env.get("PAYDUNYA_TOKEN");

      if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaPublicKey || !paydunyaToken) {
        return new Response(JSON.stringify({ success: false, error: "PayDunya not configured" }), { status: 500, headers: cors });
      }

      if (!payment.transaction_id) {
        return new Response(JSON.stringify({ success: false, error: "PayDunya transaction_id missing on payment" }), { status: 400, headers: cors });
      }

      const baseUrl = paydunyaMode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";

      const resp = await fetch(`${baseUrl}/checkout-invoice/confirm/${payment.transaction_id}`, {
        method: "GET",
        headers: {
          "PAYDUNYA-MASTER-KEY": paydunyaMasterKey,
          "PAYDUNYA-PRIVATE-KEY": paydunyaPrivateKey,
          "PAYDUNYA-PUBLIC-KEY": paydunyaPublicKey,
          "PAYDUNYA-TOKEN": paydunyaToken
        }
      });
      const data = await resp.json();

      let newStatus: string = "pending";
      if (data.status === "completed") newStatus = "completed";
      else if (data.status === "failed" || data.status === "cancelled") newStatus = "failed";

      // Update payment
      await supabase.from("payments").update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        failed_at:     newStatus === "failed"    ? new Date().toISOString() : null,
        amount_paid:   data.invoice?.total_amount ?? payment.amount,
        updated_at:    new Date().toISOString()
      }).eq("id", paymentId);

      if (newStatus === "completed" && orderId) {
        // Idempotent finalize (issues tickets if missing)
        const { error: rpcErr } = await supabase.rpc("admin_finalize_payment", { p_payment_id: paymentId });
        if (rpcErr) console.error("admin_finalize_payment error:", rpcErr);

        return new Response(JSON.stringify({
          success: true,
          state: "succeeded",
          provider: "paydunya",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      return new Response(JSON.stringify({
        success: newStatus === "completed",
        state: newStatus === "completed" ? "succeeded" : newStatus === "failed" ? "failed" : "processing",
        provider: "paydunya",
        payment_id: paymentId,
        order_id: orderId
      }), { headers: cors });
    }

    // Unknown provider
    return new Response(JSON.stringify({ success: false, error: `Unsupported provider: ${provider}` }), { status: 400, headers: cors });

  } catch (e: any) {
    console.error("verify-payment error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? "Internal error" }), { status: 500, headers: cors });
  }
});
