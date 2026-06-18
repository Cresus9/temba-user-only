import { createClient } from "npm:@supabase/supabase-js@2";
import {
  redisSetNx,
  redisSet,
  qstashPublish,
  webhookDedupKey,
  paymentStatusKey,
  PAYMENT_STATUS_TTL,
  WEBHOOK_DEDUP_TTL,
} from "../_shared/upstash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PawaPayWebhook {
  // pawaPay v2 deposits webhook format
  depositId?: string;  // Also accept depositId (from v2 API)
  transactionId?: string;  // Or transactionId
  id?: string;  // Or just id
  status?: string;  // ACCEPTED, COMPLETED, REJECTED, etc.
  event?: string;  // payment.success, payment.failed, payment.pending (legacy)
  amount?: {
    currency?: string;
    value?: string;
  };
  reference?: string;  // Our payment ID
  metadata?: {
    order_id?: string;
    payment_id?: string;
    platform?: string;
    user_id?: string;
    event_id?: string;
  };
  timestamp?: string;
  signature?: string;
  failureReason?: {
    failureCode?: string;
    failureMessage?: string;
  };
  created?: string;
  nextStep?: string;
}

// Verify webhook signature from pawaPay
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // pawaPay typically uses HMAC-SHA256 for webhook signatures
    // Implementation depends on pawaPay's actual signature method
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);
    
    // This is a placeholder - adjust based on pawaPay's actual signature method
    // Check pawaPay documentation for exact signature verification
    console.log("🔍 Verifying webhook signature (implementation depends on pawaPay docs)");
    
    // For now, return true if signature exists (implement proper verification)
    // TODO: Implement proper HMAC-SHA256 signature verification based on pawaPay docs
    return !!signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  const startTime = Date.now();
  let webhookId: string | null = null;

  try {
    console.log("🔔 pawaPay Webhook Function Started");
    console.log("📥 Request method:", req.method);
    console.log("📥 Request headers:", Object.fromEntries(req.headers.entries()));

    // Get client information
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent");
    const signature = req.headers.get("X-PawaPay-Signature") || req.headers.get("x-pawapay-signature") || req.headers.get("X-Signature") || req.headers.get("x-signature");
    
    // Log authentication status (webhooks don't need Supabase auth)
    const authHeader = req.headers.get("authorization");
    console.log("🔐 Auth check:", {
      hasAuthHeader: !!authHeader,
      signaturePresent: !!signature,
      userAgent: userAgent
    });

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pawapayWebhookSecret = Deno.env.get("PAWAPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const rawBody = await req.text();
    console.log("📥 Raw webhook body:", rawBody.substring(0, 500)); // Log first 500 chars
    
    let payload: PawaPayWebhook;
    
    try {
      payload = JSON.parse(rawBody);
      console.log("✅ Parsed pawaPay webhook payload:", JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error("❌ Failed to parse webhook body:", parseError);
      console.error("Raw body:", rawBody);
      return new Response(
        JSON.stringify({ error: `Invalid webhook payload: ${parseError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract transaction/deposit ID from various possible fields
    const transactionId = payload.depositId || payload.transactionId || payload.id;
    
    if (!transactionId) {
      console.error("❌ No transaction ID found in webhook payload");
      return new Response(
        JSON.stringify({ error: "Missing transaction ID in webhook payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("🔍 Extracted transaction ID:", transactionId);

    // ── Redis dedup: drop re-deliveries ──────────────────────────────────────
    const isNew = await redisSetNx(
      webhookDedupKey("pawapay", transactionId),
      payload.status ?? "1",
      WEBHOOK_DEDUP_TTL
    );
    if (isNew === false) {
      console.log("ℹ️ Duplicate pawaPay webhook, skipping:", transactionId);
      return new Response("OK", { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // Verify webhook signature if secret is configured
    if (pawapayWebhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, pawapayWebhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        throw new Error("Invalid webhook signature");
      }
    }

    // Log webhook attempt
    console.log("🔔 pawaPay Webhook Received:", {
      timestamp: new Date().toISOString(),
      transactionId: transactionId,
      depositId: payload.depositId,
      event: payload.event,
      status: payload.status,
      amount: payload.amount,
      reference: payload.reference,
      nextStep: payload.nextStep,
      failureReason: payload.failureReason,
      client_ip: clientIP,
      user_agent: userAgent,
    });

    // Find payment by transaction ID (try multiple fields)
    let payment = null;
    let paymentError = null;
    
    // Try depositId first (v2 API format)
    if (payload.depositId) {
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", payload.depositId)
        .maybeSingle();
      payment = result.data;
      paymentError = result.error;
    }
    
    // If not found, try transactionId
    if (!payment && payload.transactionId) {
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", payload.transactionId)
        .maybeSingle();
      payment = result.data;
      paymentError = result.error;
    }
    
    // If still not found, try id field
    if (!payment && payload.id) {
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", payload.id)
        .maybeSingle();
      payment = result.data;
      paymentError = result.error;
    }
    
    // Last resort: try using the extracted transactionId
    if (!payment && transactionId) {
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();
      payment = result.data;
      paymentError = result.error;
    }

    if (paymentError || !payment) {
      console.error("❌ Payment not found for transaction:", transactionId);
      console.error("Searched with:", {
        depositId: payload.depositId,
        transactionId: payload.transactionId,
        id: payload.id,
        extracted: transactionId
      });
      // Return 200 to prevent pawaPay from retrying (payment might not exist yet)
      return new Response("Payment not found", { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    console.log("Payment found:", payment.id);

    // Check if webhook already processed (idempotency)
    const eventType = payload.event || payload.status || "deposit.update";
    const { data: existingWebhook } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("event_type", eventType)
      .maybeSingle();

    if (existingWebhook) {
      console.log("Webhook already processed, skipping");
      return new Response("OK", { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Store webhook for idempotency
    webhookId = crypto.randomUUID();
    const { error: webhookError } = await supabase
      .from("payment_webhooks")
      .insert({
        id: webhookId,
        payment_id: payment.id,
        transaction_id: transactionId,
        event_type: eventType,
        payload: payload,
        status: "processing",
        created_at: new Date().toISOString(),
      });

    if (webhookError) {
      console.error("Failed to store webhook:", webhookError);
    }

    // Process webhook based on event type or status
    // pawaPay v2 uses status field: ACCEPTED, SUBMITTED, COMPLETED, FAILED
    // Legacy format uses event field (payment.success, payment.failed, payment.pending)
    const status = payload.status?.toUpperCase();
    const event = payload.event?.toLowerCase();
    
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const finalizeUrl    = `${supabaseUrl}/functions/v1/finalize-order`;
    const finalizeSecret = Deno.env.get("FINALIZE_ORDER_SECRET") ?? "";
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (status === "COMPLETED" || event === "payment.success") {
      await handleSuccessfulPayment(supabase, payment, payload, finalizeUrl, finalizeSecret, anonKey);
    } else if (status === "FAILED" || event === "payment.failed") {
      await handleFailedPayment(supabase, payment, payload);
    } else if (status === "ACCEPTED" || status === "SUBMITTED" || status === "PENDING" || event === "payment.pending") {
      await handlePendingPayment(supabase, payment, payload);
    } else {
      console.log("⚠️ Unhandled event/status:", { event, status, payload });
      // Still log the webhook even if we don't process it
    }

    // Update webhook status
    if (webhookId) {
      await supabase
        .from("payment_webhooks")
        .update({ status: "processed" })
        .eq("id", webhookId);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${duration}ms`);

    return new Response("OK", { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });

  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    // Update webhook status if we have an ID
    if (webhookId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from("payment_webhooks")
            .update({ 
              status: "failed",
              error: error?.message || String(error)
            })
            .eq("id", webhookId);
        }
      } catch (updateError) {
        console.error("Failed to update webhook status:", updateError);
      }
    }

    // Always return 200 for webhooks to prevent pawaPay from retrying
    // This ensures we don't get stuck in retry loops
    // Log errors for debugging instead
    return new Response("OK", { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});

async function handleSuccessfulPayment(
  supabase: any,
  payment: any,
  payload: PawaPayWebhook,
  finalizeUrl = "",
  finalizeSecret = "",
  anonKey = ""
) {
  console.log("✅ Processing successful payment:", payment.id);

  // Update payment status with completion timestamp
  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  if (paymentError) {
    throw new Error(`Failed to update payment: ${paymentError.message}`);
  }

  // ── Write Redis status key → mobile polling resolves instantly ─────────────
  await redisSet(paymentStatusKey(payment.id), "completed", PAYMENT_STATUS_TTL);

  // ── Try async finalization via QStash (5 retries, dedup-safe) ────────────
  const queued = finalizeUrl
    ? await qstashPublish(
        finalizeUrl,
        { payment_id: payment.id, provider: "pawapay" },
        {
          dedupId: `pawapay-finalize-${payment.id}`,
          retries: 5,
          forwardHeaders: {
            "X-Finalize-Secret": finalizeSecret,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      )
    : false;

  if (queued) {
    console.log("✅ Finalization queued via QStash:", payment.id);
    return;
  }

  // ── Sync fallback: QStash unavailable, finalize inline ────────────────────
  console.warn("⚠️ QStash unavailable, finalizing synchronously:", payment.id);

  // Get order ID from payment.order_id (correct relationship)
  const orderId = payment.order_id || payload.metadata?.order_id;

  if (orderId) {
    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        status: "COMPLETED",
        visible_in_history: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (orderError) {
      console.error("Failed to update order:", orderError);
    }

    // Use admin_finalize_payment RPC for idempotent ticket creation (same as Stripe)
    const { error: rpcErr } = await supabase.rpc("admin_finalize_payment", { p_payment_id: payment.id });
    if (rpcErr) {
      console.error("admin_finalize_payment error:", rpcErr);
      // Fallback to manual ticket generation if RPC fails
      await generateTickets(supabase, orderId, payment);
    }
  } else {
    console.warn("No order ID found for payment:", payment.id);
  }

  console.log("✅ Payment completed successfully:", payment.id);
}

async function handleFailedPayment(
  supabase: any,
  payment: any,
  payload: PawaPayWebhook
) {
  console.log("❌ Processing failed payment:", payment.id);

  // Update payment status with failure timestamp
  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  if (paymentError) {
    throw new Error(`Failed to update payment: ${paymentError.message}`);
  }

  // ── Write Redis status key ─────────────────────────────────────────────────
  await redisSet(paymentStatusKey(payment.id), "failed", PAYMENT_STATUS_TTL);

  // Update order status if exists (use payment.order_id)
  const orderId = payment.order_id;
  if (orderId) {
    await supabase
      .from("orders")
      .update({
        status: "CANCELLED",
        visible_in_history: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);
  }

  console.log("❌ Payment marked as failed:", payment.id);
}

async function handlePendingPayment(
  supabase: any,
  payment: any,
  payload: PawaPayWebhook
) {
  console.log("⏳ Processing pending payment:", payment.id);

  // Update payment status
  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "pending",
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  if (paymentError) {
    throw new Error(`Failed to update payment: ${paymentError.message}`);
  }

  console.log("⏳ Payment status updated to pending:", payment.id);
}

// Shared ticket generation function (same as Stripe webhook uses)
async function generateTickets(supabase: any, orderId: string, payment: any) {
  console.log("🎫 Generating tickets for order:", orderId);

  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Get ticket quantities from order
    const ticketQuantities = order.ticket_quantities || {};
    
    if (Object.keys(ticketQuantities).length === 0) {
      console.warn("No tickets to generate for order:", orderId);
      return;
    }

    // Generate tickets for each ticket type
    const ticketPromises: Promise<any>[] = [];
    
    for (const [ticketTypeId, quantity] of Object.entries(ticketQuantities)) {
      for (let i = 0; i < (quantity as number); i++) {
        const ticketPromise = supabase
          .from("tickets")
          .insert({
            user_id: order.user_id,
            event_id: order.event_id,
            ticket_type_id: ticketTypeId,
            order_id: orderId,
            event_date_id: order.event_date_id || null,
            payment_id: payment.id,
            status: "VALID",
            qr_code: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          });

        ticketPromises.push(ticketPromise);
      }
    }

    // Execute all ticket creation
    const results = await Promise.all(ticketPromises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error("Some tickets failed to generate:", errors);
      throw new Error(`Failed to generate some tickets: ${errors.length} errors`);
    }

    console.log(`✅ Generated ${ticketPromises.length} tickets for order:`, orderId);
  } catch (error) {
    console.error("Ticket generation error:", error);
    throw error;
  }
}

