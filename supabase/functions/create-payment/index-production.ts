import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreatePaymentRequest {
  idempotency_key: string;
  user_id?: string;  // optional for guest checkout
  buyer_email?: string;  // for guest checkout
  event_id: string;
  order_id?: string;  // order ID if already created
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;  // major units (e.g., 5000 XOF)
    currency: string;
  }>;
  amount_major: number;  // major units for UI
  currency: string;
  method: 'mobile_money' | 'credit_card';
  phone?: string;
  provider?: string;
  save_method?: boolean;
  return_url?: string;
  cancel_url?: string;
  description: string;
}

// Production configuration
const PRODUCTION_CONFIG = {
  // Payment limits for production safety
  MIN_AMOUNT: 100, // 100 XOF minimum
  MAX_AMOUNT: 10000000, // 10M XOF maximum
  MAX_DAILY_AMOUNT: 50000000, // 50M XOF daily limit per user
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 10,
  MAX_REQUESTS_PER_HOUR: 100,
  
  // Store information for production
  STORE: {
    name: "Temba",
    tagline: "Your Premier Event Ticketing Platform",
    phone: "+226 74 75 08 15",
    postal_address: "Secteur 23, Zone 1, Section KC, Parcelle 09-10, Ouagadougou, Burkina Faso",
    website_url: "https://tembas.com",
    logo_url: "https://tembas.com/logo.svg"
  }
};

// Enhanced validation function
function validatePaymentRequest(payload: CreatePaymentRequest): void {
  // Required fields validation
  const requiredFields = ['event_id', 'amount_major', 'currency', 'description'];
  for (const field of requiredFields) {
    if (!payload[field as keyof CreatePaymentRequest]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Amount validation
  if (payload.amount_major < PRODUCTION_CONFIG.MIN_AMOUNT) {
    throw new Error(`Amount too low. Minimum: ${PRODUCTION_CONFIG.MIN_AMOUNT} ${payload.currency}`);
  }
  
  if (payload.amount_major > PRODUCTION_CONFIG.MAX_AMOUNT) {
    throw new Error(`Amount too high. Maximum: ${PRODUCTION_CONFIG.MAX_AMOUNT} ${payload.currency}`);
  }

  // Currency validation
  if (payload.currency !== 'XOF') {
    throw new Error('Only XOF currency is supported');
  }

  // Email validation (basic)
  if (payload.buyer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.buyer_email)) {
    throw new Error('Invalid email format');
  }

  // Phone validation for mobile money
  if (payload.method === 'mobile_money' && payload.phone) {
    if (!/^\+226\d{8}$/.test(payload.phone)) {
      throw new Error('Invalid phone number format. Expected: +226XXXXXXXX');
    }
  }
}

// Rate limiting check (simple in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): void {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const current = rateLimitStore.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= PRODUCTION_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  current.count++;
}

// Enhanced logging for production
function logPaymentAttempt(payload: CreatePaymentRequest, userAgent?: string, ip?: string): void {
  console.log("🔒 PRODUCTION Payment Attempt:", {
    timestamp: new Date().toISOString(),
    event_id: payload.event_id,
    amount: payload.amount_major,
    currency: payload.currency,
    method: payload.method,
    user_id: payload.user_id ? `user_${payload.user_id.slice(0, 8)}...` : 'guest',
    buyer_email: payload.buyer_email ? `${payload.buyer_email.split('@')[0]}@***` : undefined,
    user_agent: userAgent,
    ip: ip,
    idempotency_key: payload.idempotency_key
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let paymentRecord: any = null;

  try {
    console.log("🚀 PRODUCTION Payment Function Started");

    // Get client info for logging and rate limiting
    const userAgent = req.headers.get("user-agent");
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    
    // Rate limiting based on IP
    checkRateLimit(clientIP);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Production Paydunya keys (different from test)
    const paydunyaMasterKey = Deno.env.get("PAYDUNYA_MASTER_KEY_PROD");
    const paydunyaPrivateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY_PROD");
    const paydunyaPublicKey = Deno.env.get("PAYDUNYA_PUBLIC_KEY_PROD");
    const paydunyaToken = Deno.env.get("PAYDUNYA_TOKEN_PROD");
    const paydunyaMode = Deno.env.get("PAYDUNYA_MODE") || "live"; // Default to live for production

    console.log("🔧 Environment check:", {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      paydunyaMasterKey: !!paydunyaMasterKey,
      paydunyaPrivateKey: !!paydunyaPrivateKey,
      paydunyaPublicKey: !!paydunyaPublicKey,
      paydunyaToken: !!paydunyaToken,
      paydunyaMode: paydunyaMode,
      isProduction: paydunyaMode === "live"
    });

    // Validate environment
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaPublicKey || !paydunyaToken) {
      throw new Error("Paydunya PRODUCTION configuration missing. Please configure all Paydunya PRODUCTION API keys in Supabase secrets.");
    }

    // Ensure we're in production mode
    if (paydunyaMode !== "live") {
      console.warn("⚠️ WARNING: Not in production mode. Current mode:", paydunyaMode);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request
    let payload: CreatePaymentRequest;
    try {
      const requestBody = await req.text();
      payload = JSON.parse(requestBody);
      
      // Enhanced validation for production
      validatePaymentRequest(payload);
      
      // Log payment attempt
      logPaymentAttempt(payload, userAgent, clientIP);
      
    } catch (parseError) {
      console.error("❌ Request validation failed:", parseError);
      throw new Error(`Invalid request: ${parseError.message}`);
    }

    // Check for duplicate idempotency key
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, transaction_id")
      .eq("idempotency_key", payload.idempotency_key)
      .single();

    if (existingPayment) {
      console.log("🔄 Duplicate request detected, returning existing payment:", existingPayment.id);
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: existingPayment.id,
          status: existingPayment.status,
          message: "Payment already exists"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer email
    let customerEmail = payload.buyer_email;
    if (!customerEmail && payload.user_id) {
      try {
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', payload.user_id)
          .single();
        
        if (userError) {
          console.error("❌ Failed to get user email:", userError);
          throw new Error(`Failed to get user information: ${userError.message}`);
        }
        customerEmail = userProfile.email;
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        throw new Error(`Error fetching user profile: ${error.message}`);
      }
    }

    if (!customerEmail) {
      throw new Error("Customer email is required (either buyer_email or user_id must be provided)");
    }

    console.log("✅ Customer email resolved:", customerEmail.split('@')[0] + '@***');

    // Create payment record with enhanced fields
    const paymentToken = crypto.randomUUID();
    console.log("💾 Creating payment record with token:", paymentToken);
    
    const { data: newPaymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: payload.user_id || null,
        event_id: payload.event_id,
        amount: payload.amount_major,
        currency: payload.currency,
        status: "pending",
        payment_method: payload.method,
        token: paymentToken,
        idempotency_key: payload.idempotency_key,
        customer_email: customerEmail,
        customer_phone: payload.phone,
        client_ip: clientIP,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error("❌ Database payment insert error:", paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    paymentRecord = newPaymentRecord;
    console.log("✅ Payment record created:", paymentRecord.id);

    // Prepare Paydunya request with production settings
    const baseUrl = req.headers.get("origin") || "https://tembas.com";
    const paydunyaPayload = {
      invoice: {
        total_amount: payload.amount_major,
        description: payload.description,
        return_url: payload.return_url || `${baseUrl}/payment/success?order=${payload.event_id}&token=${paymentToken}`,
        cancel_url: payload.cancel_url || `${baseUrl}/payment/cancelled?order=${payload.event_id}`,
        callback_url: `${supabaseUrl}/functions/v1/paydunya-ipn`
      },
      store: PRODUCTION_CONFIG.STORE,
      custom_data: {
        order_id: payload.event_id,
        payment_id: paymentRecord.id,
        platform: "temba",
        environment: "production",
        version: "1.0"
      }
    };

    console.log("📡 Calling Paydunya PRODUCTION API");

    // Use production Paydunya API URL
    const paydunyaApiUrl = paydunyaMode === "live" 
      ? "https://app.paydunya.com/api/v1/checkout-invoice/create"
      : "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

    console.log("🌐 Using Paydunya API URL:", paydunyaApiUrl, "Mode:", paydunyaMode);

    // Call Paydunya API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const paydunyaResponse = await fetch(paydunyaApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": paydunyaMasterKey,
          "PAYDUNYA-PRIVATE-KEY": paydunyaPrivateKey,
          "PAYDUNYA-PUBLIC-KEY": paydunyaPublicKey,
          "PAYDUNYA-TOKEN": paydunyaToken
        },
        body: JSON.stringify(paydunyaPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await paydunyaResponse.text();
      console.log("📥 Paydunya response status:", paydunyaResponse.status);
      console.log("📥 Paydunya response length:", responseText.length);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse Paydunya response:", parseError);
        throw new Error(`Invalid response from Paydunya: ${responseText.substring(0, 200)}...`);
      }

      console.log("📊 Paydunya response code:", responseData.response_code);

      if (responseData.response_code === "00") {
        // Success - update payment record
        const paydunyaToken = responseData.token || responseData.response_json?.invoice_token;
        const invoiceUrl = responseData.invoice_url || responseData.response_json?.invoice_url;

        await supabase
          .from("payments")
          .update({
            transaction_id: paydunyaToken,
            paydunya_response: responseData,
            updated_at: new Date().toISOString()
          })
          .eq("id", paymentRecord.id);

        const processingTime = Date.now() - startTime;
        console.log("✅ PRODUCTION Payment created successfully:", {
          payment_id: paymentRecord.id,
          paydunya_token: paydunyaToken,
          processing_time_ms: processingTime,
          invoice_url: !!invoiceUrl
        });

        return new Response(
          JSON.stringify({
            success: true,
            payment_url: invoiceUrl,
            payment_token: paydunyaToken,
            payment_id: paymentRecord.id,
            processing_time_ms: processingTime
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Paydunya error - clean up payment record
        await supabase
          .from("payments")
          .update({
            status: "failed",
            error_message: responseData.response_text || responseData.description,
            paydunya_response: responseData,
            updated_at: new Date().toISOString()
          })
          .eq("id", paymentRecord.id);
        
        const errorMessage = responseData.response_text || responseData.description || "Payment creation failed";
        console.error("❌ Paydunya API error:", errorMessage);
        throw new Error(`Payment failed: ${errorMessage}`);
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Payment request timed out. Please try again.');
      }
      throw fetchError;
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ PRODUCTION Payment error:", {
      error: error.message,
      processing_time_ms: processingTime,
      payment_id: paymentRecord?.id
    });
    
    // Update payment record with error if it exists
    if (paymentRecord) {
      try {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", paymentRecord.id);
      } catch (updateError) {
        console.error("❌ Failed to update payment record with error:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Payment creation failed",
        processing_time_ms: processingTime,
        payment_id: paymentRecord?.id
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
