import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PaydunyaIPN {
  invoice_token: string;
  status: string;
  customer?: {
    name: string;
    phone: string;
    email: string;
  };
  invoice?: {
    total_amount: number;
    status: string;
    custom_data?: {
      order_id: string;
      payment_id: string;
      platform: string;
      environment?: string;
    };
  };
  // Additional security fields
  signature?: string;
  timestamp?: string;
}

// Production security configuration
const SECURITY_CONFIG = {
  // Allowed IP ranges for Paydunya webhooks (update with actual Paydunya IPs)
  ALLOWED_IPS: [
    "41.189.178.0/24", // Example Paydunya IP range - update with real ones
    "196.216.0.0/16",  // Example range - update with real ones
  ],
  
  // Maximum age for webhook requests (5 minutes)
  MAX_WEBHOOK_AGE_MS: 5 * 60 * 1000,
  
  // Rate limiting for webhooks
  MAX_WEBHOOKS_PER_MINUTE: 100,
};

// Rate limiting store for webhooks
const webhookRateLimit = new Map<string, { count: number; resetTime: number }>();

// Verify webhook signature (if Paydunya provides one)
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);
    
    // This is a simplified example - adjust based on Paydunya's actual signature method
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(
      crypto.subtle.digest('SHA-256', new Uint8Array([...key, ...data]))
    )));
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Check if IP is in allowed ranges (simplified check)
function isAllowedIP(ip: string): boolean {
  // In production, implement proper CIDR matching
  // For now, allow all IPs but log them for monitoring
  console.log("🔍 Webhook from IP:", ip);
  return true; // TODO: Implement proper IP filtering
}

// Rate limiting for webhooks
function checkWebhookRateLimit(ip: string): void {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const current = webhookRateLimit.get(ip);
  
  if (!current || now > current.resetTime) {
    webhookRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= SECURITY_CONFIG.MAX_WEBHOOKS_PER_MINUTE) {
    throw new Error(`Webhook rate limit exceeded for IP: ${ip}`);
  }
  
  current.count++;
}

// Enhanced logging for production webhooks
function logWebhookAttempt(payload: PaydunyaIPN, ip: string, userAgent?: string): void {
  console.log("🔔 PRODUCTION Webhook Received:", {
    timestamp: new Date().toISOString(),
    invoice_token: payload.invoice_token,
    status: payload.status,
    amount: payload.invoice?.total_amount,
    order_id: payload.invoice?.custom_data?.order_id,
    platform: payload.invoice?.custom_data?.platform,
    environment: payload.invoice?.custom_data?.environment,
    client_ip: ip,
    user_agent: userAgent,
    has_signature: !!payload.signature
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let webhookId: string | null = null;

  try {
    console.log("🔔 PRODUCTION Webhook Function Started");

    // Get client information
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent");
    
    // Security checks
    if (!isAllowedIP(clientIP)) {
      throw new Error(`Webhook from unauthorized IP: ${clientIP}`);
    }
    
    // Rate limiting
    checkWebhookRateLimit(clientIP);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("PAYDUNYA_WEBHOOK_SECRET"); // Optional signature verification

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const rawBody = await req.text();
    let payload: PaydunyaIPN;
    
    try {
      payload = JSON.parse(rawBody);
      logWebhookAttempt(payload, clientIP, userAgent);
    } catch (parseError) {
      console.error("❌ Invalid webhook payload:", parseError);
      throw new Error("Invalid JSON payload");
    }

    // Verify webhook signature if secret is configured
    if (webhookSecret && payload.signature) {
      if (!verifyWebhookSignature(rawBody, payload.signature, webhookSecret)) {
        console.error("❌ Webhook signature verification failed");
        throw new Error("Invalid webhook signature");
      }
      console.log("✅ Webhook signature verified");
    }

    // Validate required fields
    if (!payload.invoice_token || !payload.status) {
      throw new Error("Missing required webhook fields: invoice_token or status");
    }

    // Check webhook timestamp if provided (prevent replay attacks)
    if (payload.timestamp) {
      const webhookTime = new Date(payload.timestamp).getTime();
      const now = Date.now();
      
      if (now - webhookTime > SECURITY_CONFIG.MAX_WEBHOOK_AGE_MS) {
        throw new Error("Webhook too old - possible replay attack");
      }
    }

    // Log webhook attempt in database for audit
    const { data: webhookLog, error: logError } = await supabase
      .from("payment_webhooks")
      .insert({
        provider: "paydunya",
        event_key: payload.invoice_token,
        status: payload.status,
        raw: payload,
        client_ip: clientIP,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (logError) {
      console.error("❌ Failed to log webhook:", logError);
    } else {
      webhookId = webhookLog.id;
      console.log("📝 Webhook logged with ID:", webhookId);
    }

    // Find payment by transaction_id (Paydunya token)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        orders (
          id,
          event_id,
          user_id,
          status,
          ticket_quantities,
          total,
          currency
        )
      `)
      .eq("transaction_id", payload.invoice_token)
      .single();

    if (paymentError || !payment) {
      console.error("❌ Payment not found for token:", payload.invoice_token);
      throw new Error(`Payment not found for token: ${payload.invoice_token}`);
    }

    console.log("💳 Payment found:", {
      payment_id: payment.id,
      current_status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });

    // Prevent duplicate processing
    if (payment.status === "completed" && payload.status === "completed") {
      console.log("⚠️ Payment already completed, skipping duplicate webhook");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already completed",
          payment_id: payment.id,
          status: payment.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine new payment status
    let newStatus = "pending";
    let completedAt = null;
    let failedAt = null;

    switch (payload.status.toLowerCase()) {
      case "completed":
      case "success":
      case "successful":
        newStatus = "completed";
        completedAt = new Date().toISOString();
        break;
      case "cancelled":
      case "canceled":
      case "failed":
      case "error":
        newStatus = "failed";
        failedAt = new Date().toISOString();
        break;
      case "pending":
      case "processing":
        newStatus = "pending";
        break;
      default:
        console.warn("⚠️ Unknown payment status:", payload.status);
        newStatus = "pending";
    }

    console.log("🔄 Status transition:", {
      from: payment.status,
      to: newStatus,
      webhook_status: payload.status
    });

    // Validate amount if provided
    if (payload.invoice?.total_amount && payload.invoice.total_amount !== payment.amount) {
      console.error("❌ Amount mismatch:", {
        expected: payment.amount,
        received: payload.invoice.total_amount
      });
      throw new Error("Payment amount mismatch");
    }

    // Update payment status with enhanced tracking
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        completed_at: completedAt,
        failed_at: failedAt,
        amount_paid: payload.invoice?.total_amount || payment.amount,
        ipn_data: payload,
        webhook_id: webhookId,
        last_webhook_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("❌ Failed to update payment:", updateError);
      throw updateError;
    }

    console.log("✅ Payment updated successfully");

    // Process completed payments
    if (newStatus === "completed") {
      console.log("🎫 Processing completed payment - creating tickets");
      
      const order = payment.orders;
      if (!order) {
        console.error("❌ No order found for payment:", payment.id);
        throw new Error("Order not found for payment");
      }

      // Update order status
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          status: "COMPLETED",
          payment_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);

      if (orderUpdateError) {
        console.error("❌ Failed to update order:", orderUpdateError);
      } else {
        console.log("✅ Order status updated to COMPLETED");
      }

      // Create tickets for the order
      if (order.ticket_quantities) {
        const ticketInserts = [];
        
        for (const [ticketTypeId, quantity] of Object.entries(order.ticket_quantities)) {
          for (let i = 0; i < Number(quantity); i++) {
            ticketInserts.push({
              order_id: order.id,
              event_id: order.event_id,
              user_id: order.user_id,
              ticket_type_id: ticketTypeId,
              status: "VALID",
              payment_status: "paid",
              payment_id: payment.id,
              created_at: new Date().toISOString()
            });
          }
        }

        if (ticketInserts.length > 0) {
          const { error: ticketsError } = await supabase
            .from("tickets")
            .insert(ticketInserts);

          if (ticketsError) {
            console.error("❌ Error creating tickets:", ticketsError);
            // Don't throw here - payment is still valid, just log the error
          } else {
            console.log(`✅ Created ${ticketInserts.length} tickets for order ${order.id}`);
          }
        }
      }

      // TODO: Send confirmation email/SMS to customer
      console.log("📧 TODO: Send confirmation notification to customer");
    }

    const processingTime = Date.now() - startTime;
    console.log("✅ PRODUCTION Webhook processed successfully:", {
      payment_id: payment.id,
      new_status: newStatus,
      processing_time_ms: processingTime,
      webhook_id: webhookId
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        payment_id: payment.id,
        new_status: newStatus,
        processing_time_ms: processingTime,
        webhook_id: webhookId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ PRODUCTION Webhook error:", {
      error: error.message,
      processing_time_ms: processingTime,
      webhook_id: webhookId
    });
    
    // Update webhook log with error if we have the ID
    if (webhookId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        
        await supabase
          .from("payment_webhooks")
          .update({
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq("id", webhookId);
      } catch (logError) {
        console.error("❌ Failed to update webhook log:", logError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
        webhook_id: webhookId
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
