// supabase/functions/verify-pawapay-payment/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import {
  applyPawaPayProviderStatus,
  pawaPaySyncToVerifyJsonBody,
} from "../_shared/pawapayPaymentSync.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type ReqBody = {
  payment_id?: string;
  internal_token?: string;
  payment_token?: string;
  order_id?: string;
};

// Fire-and-forget: ask finalize-order to send the ticket email for this payment.
// finalize-order (email_only) only sends the email; it is idempotent via
// payments.metadata.ticket_email_sent_at. Never throws, never blocks the response.
function triggerTicketEmail(paymentId: string): void {
  try {
    const baseUrl = Deno.env.get("SUPABASE_URL");
    if (!baseUrl || !paymentId) return;
    const pending = fetch(`${baseUrl}/functions/v1/finalize-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Finalize-Secret": Deno.env.get("FINALIZE_ORDER_SECRET") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
      },
      body: JSON.stringify({ payment_id: paymentId, email_only: true }),
    })
      .then((r) => {
        if (!r.ok) console.warn("[ticket-email] finalize-order HTTP", r.status);
      })
      .catch((err) => console.warn("[ticket-email] trigger failed:", err));
    (globalThis as any).EdgeRuntime?.waitUntil?.(pending);
  } catch (err) {
    console.warn("[ticket-email] trigger error:", err);
  }
}

function jsonBody(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: cors });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase configuration missing");

    const body: ReqBody = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let payment: any = null;

    if (body.payment_id) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", body.payment_id)
        .maybeSingle());
    }

    if (!payment && body.internal_token) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("token", body.internal_token)
        .maybeSingle());
    }

    if (!payment && body.payment_token) {
      ({ data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", body.payment_token)
        .maybeSingle());
    }

    if (!payment) {
      return jsonBody({ success: false, error: "Payment not found" }, 404);
    }

    const paymentId = payment.id as string;
    const provider = (payment.provider ?? "").toLowerCase();
    const orderId = payment.order_id ?? body.order_id ?? null;
    const dbStatus = (payment.status as string)?.toLowerCase() ?? "";

    if (provider !== "pawapay") {
      return jsonBody({
        success: false,
        error: `This function only handles pawaPay payments. Provider: ${provider}`,
      }, 400);
    }

    if (!orderId) {
      console.warn("verify-pawapay-payment: payment has no order_id; ticket issuance will be skipped");
    }

    const pawapayApiKey = Deno.env.get("PAWAPAY_API_KEY");
    const pawapayMode = Deno.env.get("PAWAPAY_MODE") || "production";

    if (!pawapayApiKey) {
      return jsonBody({ success: false, error: "pawaPay not configured" }, 500);
    }

    if (!payment.transaction_id) {
      console.error("❌ Payment has no transaction_id:", { paymentId, dbStatus, orderId });

      if (dbStatus === "pending" || dbStatus === "failed") {
        return jsonBody({
          success: false,
          state: "failed",
          message:
            "Payment was never created at pawaPay. Please try again or contact support.",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
          error_code: "NO_TRANSACTION_ID",
        });
      }

      return jsonBody({
        success: false,
        state: "processing",
        message: "Payment verification unavailable - transaction ID missing",
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId,
      });
    }

    const depositId = payment.transaction_id as string;

    // Hot path: DB already terminal — skip pawaPay HTTP (webhook or prior verify updated row).
    if (dbStatus === "completed") {
      const sync = await applyPawaPayProviderStatus(
        supabase,
        payment,
        "COMPLETED",
        depositId,
      );
      if (sync.ok && sync.state === "succeeded" && sync.order_id && !payment.metadata?.ticket_email_sent_at) {
        triggerTicketEmail(paymentId);
      }
      return jsonBody(pawaPaySyncToVerifyJsonBody(sync, "pawapay"));
    }

    if (dbStatus === "failed") {
      return jsonBody({
        success: false,
        state: "failed",
        message: "Le paiement a échoué.",
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId,
      });
    }

    const apiVersion = "v2";
    const pawapayApiUrl = pawapayMode === "production"
      ? `https://api.pawapay.io/${apiVersion}/deposits/${depositId}`
      : `https://api.sandbox.pawapay.io/${apiVersion}/deposits/${depositId}`;

    console.log("📡 verify-pawapay-payment GET", pawapayApiUrl);

    try {
      const resp = await fetch(pawapayApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${pawapayApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        console.error(`pawaPay API error: ${resp.status} ${resp.statusText}`);
        return jsonBody({
          success: false,
          state: "processing",
          message: "Unable to verify payment status with pawaPay",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
        });
      }

      const depositResp = await resp.json();

      if (depositResp.status !== "FOUND" || !depositResp.data) {
        if (dbStatus === "pending" || dbStatus === "failed") {
          return jsonBody({
            success: false,
            state: "failed",
            message:
              "Payment was not found at pawaPay. The payment may not have been created successfully.",
            provider: "pawapay",
            payment_id: paymentId,
            order_id: orderId,
            error_code: "DEPOSIT_NOT_FOUND",
          });
        }

        return jsonBody({
          success: false,
          state: "processing",
          message:
            "Deposit not found yet at pawaPay. This may indicate the payment is still being processed.",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
        });
      }

      const d = depositResp.data;
      const providerStatus = (d.status || d.depositStatus || "").toUpperCase();

      if (!providerStatus) {
        return jsonBody({
          success: false,
          state: "processing",
          message: "Invalid deposit status from pawaPay",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
        });
      }

      const canonicalTx = d.depositId ?? d.transactionId ?? d.id ?? depositId;

      const sync = await applyPawaPayProviderStatus(
        supabase,
        payment,
        providerStatus,
        canonicalTx,
      );

      if (sync.ok && sync.state === "succeeded" && sync.order_id && !payment.metadata?.ticket_email_sent_at) {
        triggerTicketEmail(paymentId);
      }
      return jsonBody(pawaPaySyncToVerifyJsonBody(sync, "pawapay"));
    } catch (error: any) {
      console.error("pawaPay verification error:", error);
      return jsonBody({
        success: false,
        state: "processing",
        message: `Error verifying payment: ${error.message}`,
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId,
      });
    }
  } catch (error: any) {
    console.error("verify-pawapay-payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: cors },
    );
  }
});
