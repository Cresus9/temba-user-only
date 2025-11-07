// supabase/functions/verify-pawapay-payment/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase configuration missing");

    const body: ReqBody = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---------- Locate the payment row ----------
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
      return new Response(JSON.stringify({ success: false, error: "Payment not found" }), { status: 404, headers: cors });
    }

    const paymentId = payment.id as string;
    const provider  = (payment.provider ?? "").toLowerCase();
    const orderId   = payment.order_id ?? body.order_id ?? null;
    const status    = payment.status as string;

    // Only handle pawaPay payments
    if (provider !== "pawapay") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `This function only handles pawaPay payments. Provider: ${provider}` 
      }), { status: 400, headers: cors });
    }

    if (!orderId) {
      console.warn("verify-pawapay-payment: payment has no order_id; ticket issuance will be skipped");
    }

    // ---------- Handle PAWAPAY ----------
    const pawapayApiKey = Deno.env.get("PAWAPAY_API_KEY");
    const pawapayMode = Deno.env.get("PAWAPAY_MODE") || "production";

    if (!pawapayApiKey) {
      return new Response(JSON.stringify({ success: false, error: "pawaPay not configured" }), { status: 500, headers: cors });
    }

    // The depositId is stored in transaction_id (from create-pawapay-payment)
    // CRITICAL: If transaction_id is missing, the payment was likely never created at pawaPay
    // In that case, we can't verify it - the payment creation must have failed
    if (!payment.transaction_id) {
      console.error("❌ Payment has no transaction_id - payment was likely never created at pawaPay:", {
        paymentId: payment.id,
        paymentStatus: payment.status,
        orderId: orderId
      });
      
      // If payment status is still pending and no transaction_id, it means creation failed
      if (payment.status === 'pending' || payment.status === 'failed') {
        return new Response(JSON.stringify({
          success: false,
          state: "failed",
          message: "Payment was never created at pawaPay. Please try again or contact support.",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
          error_code: "NO_TRANSACTION_ID"
        }), { headers: cors });
      }
      
      // If payment is marked as completed but has no transaction_id, this is a data inconsistency
      // We can't verify it, but we'll return processing state to allow retry
      return new Response(JSON.stringify({
        success: false,
        state: "processing",
        message: "Payment verification unavailable - transaction ID missing",
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId
      }), { headers: cors });
    }
    
    const depositId = payment.transaction_id;
    
    console.log("🔍 Looking up deposit at pawaPay:", {
      depositId,
      paymentId: payment.id,
      provider: payment.provider,
      paymentStatus: payment.status
    });
    
    // Get deposit status from pawaPay API
    const apiVersion = "v2";
    const pawapayApiUrl = pawapayMode === "production"
      ? `https://api.pawapay.io/${apiVersion}/deposits/${depositId}`
      : `https://api.sandbox.pawapay.io/${apiVersion}/deposits/${depositId}`;
    
    console.log("📡 pawaPay API URL:", pawapayApiUrl);

    try {
      const resp = await fetch(pawapayApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${pawapayApiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!resp.ok) {
        console.error(`pawaPay API error: ${resp.status} ${resp.statusText}`);
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          message: "Unable to verify payment status with pawaPay",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      const depositResp = await resp.json();
      
      console.log("📥 pawaPay v2 response:", JSON.stringify(depositResp, null, 2));
      
      // v2 shape: { status: "FOUND"|"NOT_FOUND", data: {...} }
      if (depositResp.status !== "FOUND" || !depositResp.data) {
        console.log("⚠️ Deposit not found or invalid response structure:", {
          responseStatus: depositResp.status,
          hasData: !!depositResp.data,
          depositId: depositId,
          fullResponse: depositResp
        });
        
        // If deposit is NOT_FOUND, it might mean:
        // 1. Deposit was never created (payment creation failed)
        // 2. Deposit ID is incorrect
        // 3. Deposit is still being processed (unlikely for NOT_FOUND)
        
        // Check if payment status suggests it was never created
        if (payment.status === 'pending' || payment.status === 'failed') {
          console.error("❌ Deposit NOT_FOUND and payment status is pending/failed - payment likely never created");
          return new Response(JSON.stringify({
            success: false,
            state: "failed",
            message: "Payment was not found at pawaPay. The payment may not have been created successfully.",
            provider: "pawapay",
            payment_id: paymentId,
            order_id: orderId,
            error_code: "DEPOSIT_NOT_FOUND"
          }), { headers: cors });
        }
        
        // If payment status is completed but deposit not found, this is a data inconsistency
        // Return processing to allow retry (maybe deposit will appear later)
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          message: "Deposit not found yet at pawaPay. This may indicate the payment is still being processed.",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      const d = depositResp.data; // the actual deposit payload
      
      // CRITICAL: Extract status from nested data object (v2 API structure)
      const providerStatus = (d.status || d.depositStatus || "").toUpperCase() as "ACCEPTED" | "SUBMITTED" | "COMPLETED" | "FAILED";
      
      console.log("🔍 Extracted deposit status:", {
        providerStatus,
        rawStatus: d.status,
        depositId: d.depositId,
        fullData: d
      });

      if (!providerStatus) {
        console.error("❌ No status found in deposit data:", d);
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          message: "Invalid deposit status from pawaPay",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      // Map provider status -> your internal status/state
      // ACCEPTED/SUBMITTED => still processing
      // COMPLETED => success
      // FAILED => failure
      let newStatus: "pending" | "completed" | "failed" = "pending";
      let state: "processing" | "succeeded" | "failed" = "processing";

      if (providerStatus === "COMPLETED") {
        newStatus = "completed";
        state = "succeeded";
        console.log("✅ Payment COMPLETED - will finalize and create tickets");
      } else if (providerStatus === "FAILED") {
        newStatus = "failed";
        state = "failed";
        console.log("❌ Payment FAILED");
      } else {
        // ACCEPTED or SUBMITTED => still processing
        newStatus = "pending";
        state = "processing";
        console.log("⏳ Payment still processing:", providerStatus);
      }

      // Persist status + canonical IDs from v2
      const updateResult = await supabase.from("payments").update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        failed_at: newStatus === "failed" ? new Date().toISOString() : null,
        transaction_id: d.depositId ?? d.transactionId ?? d.id ?? payment.transaction_id,
        updated_at: new Date().toISOString()
      }).eq("id", paymentId);

      if (updateResult.error) {
        console.error("❌ Failed to update payment status:", updateResult.error);
        return new Response(JSON.stringify({
          success: false,
          state: "processing",
          message: `Failed to update payment: ${updateResult.error.message}`,
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId
        }), { headers: cors });
      }

      console.log("✅ Payment status updated:", {
        paymentId,
        oldStatus: payment.status,
        newStatus,
        state,
        orderId
      });

      // Finalize on success (idempotent) - this creates tickets
      if (newStatus === "completed" && orderId) {
        console.log("🎫 Calling admin_finalize_payment to create tickets...");
        const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_finalize_payment", { p_payment_id: paymentId });
        
        if (rpcErr) {
          console.error("❌ admin_finalize_payment error:", rpcErr);
          return new Response(JSON.stringify({
            success: false,
            state: "succeeded", // Payment succeeded but ticket creation failed
            message: `Payment completed but ticket creation failed: ${rpcErr.message}`,
            provider: "pawapay",
            payment_id: paymentId,
            order_id: orderId
          }), { headers: cors });
        }

        console.log("✅ Tickets created successfully:", rpcData);

        return new Response(JSON.stringify({
          success: true,
          state: "succeeded",
          provider: "pawapay",
          payment_id: paymentId,
          order_id: orderId,
          message: "Payment verified and tickets created"
        }), { headers: cors });
      }

      return new Response(JSON.stringify({
        success: false,
        state,
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId
      }), { headers: cors });

    } catch (error: any) {
      console.error("pawaPay verification error:", error);
      return new Response(JSON.stringify({
        success: false,
        state: "processing",
        message: `Error verifying payment: ${error.message}`,
        provider: "pawapay",
        payment_id: paymentId,
        order_id: orderId
      }), { headers: cors });
    }

  } catch (error: any) {
    console.error("verify-pawapay-payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: cors }
    );
  }
});

