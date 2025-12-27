import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreatePawaPayPaymentRequest {
  idempotency_key: string;
  user_id?: string;  // optional for guest checkout
  buyer_email?: string;  // for guest checkout
  event_id: string;
  order_id?: string;  // order ID if already created
  event_date_id?: string | null;  // NEW: For multi-date events
  ticket_lines?: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;  // major units (e.g., 5000 XOF)
    currency: string;
  }>;
  ticket_quantities?: Record<string, number>;  // NEW: For order creation (e.g., { "ticket-type-id": 2 })
  amount_major: number;  // major units for UI
  currency: string;
  method: 'mobile_money';
  phone: string;  // required for mobile money
  provider: string;  // orange_money, mtn_mobile_money, moov_money, etc.
  payment_method?: string;  // NEW: Required if create_order is true (e.g., 'MOBILE_MONEY')
  create_order?: boolean;  // NEW: Create order if it doesn't exist (similar to Stripe)
  preAuthorisationCode?: string;  // OTP code for second attempt (optional)
  pre_authorisation_code?: string;  // Alternative field name
  otpCode?: string;  // Alternative field name
  return_url?: string;
  cancel_url?: string;
  description: string;
}

// Helper to extract payment URL from pawaPay response (normalize all possible field names)
function extractPaymentUrl(responseData: any): string | undefined {
  return (
    responseData.paymentUrl ??
    responseData.payment_url ??
    responseData.redirectUrl ??
    responseData.redirect_url ??
    undefined
  ) ?? undefined;
}

// Helper to detect if pawaPay response indicates pre-authorization is required
function isPreAuthRequired(responseData: any): boolean {
  const msg = (
    responseData.failureReason?.failureMessage?.toLowerCase() ??
    responseData.failureReason?.failureCode?.toLowerCase() ??
    ""
  );
  // Broad but safe checks for pre-auth requirement
  return (
    msg.includes("pre-authorisation") ||
    msg.includes("pre authorisation") ||
    msg.includes("pre-authorization") ||
    msg.includes("pre authorization") ||
    msg.includes("otp") ||
    (responseData.failureReason?.failureCode === "INVALID_PARAMETER" && 
     msg.includes("orange_bfa"))
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    console.log("🚀 pawaPay Payment Function Started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pawapayApiKey = Deno.env.get("PAWAPAY_API_KEY");
    const pawapayApiSecret = Deno.env.get("PAWAPAY_API_SECRET");
    const pawapayMode = Deno.env.get("PAWAPAY_MODE") || "production";

    console.log("Environment check:", {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      pawapayApiKey: !!pawapayApiKey,
      pawapayApiSecret: !!pawapayApiSecret,
      pawapayMode: pawapayMode
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    if (!pawapayApiKey) {
      throw new Error("pawaPay configuration missing. Please configure PAWAPAY_API_KEY in Supabase secrets.");
    }
    
    // PAWAPAY_API_SECRET is optional - some pawaPay accounts may not require it
    // If not provided, we'll only use the API key in Authorization header

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let payload: CreatePawaPayPaymentRequest;
    try {
      const requestBody = await req.text();
      console.log("Raw request body:", requestBody);
      
      payload = JSON.parse(requestBody);
      console.log("pawaPay payment request payload:", {
        idempotency_key: payload.idempotency_key,
        event_id: payload.event_id,
        amount_major: payload.amount_major,
        currency: payload.currency,
        method: payload.method,
        provider: payload.provider,
        phone: payload.phone,
        buyer_email: payload.buyer_email,
        user_id: payload.user_id
      });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error(`Invalid request body format: ${parseError.message}`);
    }

    // Validate required fields
    if (!payload.event_id) {
      throw new Error("Missing required field: event_id");
    }
    if (!payload.amount_major) {
      throw new Error("Missing required field: amount_major");
    }
    if (!payload.currency) {
      throw new Error("Missing required field: currency");
    }
    if (!payload.phone) {
      throw new Error("Missing required field: phone (required for mobile money)");
    }
    if (!payload.provider) {
      throw new Error("Missing required field: provider");
    }
    if (!payload.description) {
      throw new Error("Missing required field: description");
    }

    // Validate currency - pawaPay only handles XOF for mobile money
    if (payload.currency !== 'XOF') {
      throw new Error("pawaPay mobile money payments must be in XOF currency");
    }

    // Get user email for pawaPay
    let customerEmail = payload.buyer_email;
    if (!customerEmail && payload.user_id) {
      try {
        // Get user email from database
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', payload.user_id)
          .single();
        
        if (userError) {
          console.error("Failed to get user email:", userError);
          throw new Error(`Failed to get user information: ${userError.message}`);
        }
        customerEmail = userProfile.email;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        throw new Error(`Error fetching user profile: ${error.message}`);
      }
    }

    if (!customerEmail) {
      throw new Error("Customer email is required (either buyer_email or user_id must be provided)");
    }

    console.log("Customer email resolved:", customerEmail);

    // ═══════════════════════════════════════════════════════
    // ✅ CREATE ORDER IF NEEDED (Similar to Stripe flow)
    // ═══════════════════════════════════════════════════════
    let finalOrderId = payload.order_id;
    const createOrder = payload.create_order ?? false;
    
    if (createOrder && !finalOrderId && payload.ticket_quantities && payload.payment_method) {
      console.log("🔵 Creating order via Edge Function (bypassing RLS)");
      
      // Convert ticket_lines to ticket_quantities if needed
      let ticketQuantities = payload.ticket_quantities;
      if (!ticketQuantities && payload.ticket_lines) {
        ticketQuantities = {};
        for (const line of payload.ticket_lines) {
          ticketQuantities[line.ticket_type_id] = (ticketQuantities[line.ticket_type_id] || 0) + line.quantity;
        }
      }
      
      if (!ticketQuantities || Object.keys(ticketQuantities).length === 0) {
        throw new Error("ticket_quantities is required when create_order is true");
      }
      
      // Calculate total amount from ticket quantities
      const { data: ticketTypes, error: ticketTypesError } = await supabase
        .from('ticket_types')
        .select('id, price')
        .in('id', Object.keys(ticketQuantities));
      
      if (ticketTypesError) {
        console.error("Failed to fetch ticket types:", ticketTypesError);
        throw new Error(`Failed to fetch ticket types: ${ticketTypesError.message}`);
      }
      
      if (!ticketTypes || ticketTypes.length === 0) {
        throw new Error('Ticket types not found');
      }

      const totalAmount = ticketTypes.reduce((sum, ticket) => {
        const quantity = ticketQuantities[ticket.id] || 0;
        return sum + (ticket.price * quantity);
      }, 0);

      console.log("🔵 Order total calculated:", totalAmount);

      // Create order using service role (bypasses RLS)
      // IMPORTANT: Constraint requires either user_id OR guest_email, not both
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: payload.user_id || null,
          event_id: payload.event_id,
          total: totalAmount,
          status: 'AWAITING_PAYMENT',
          payment_method: payload.payment_method,
          ticket_quantities: ticketQuantities,
          event_date_id: payload.event_date_id || null,
          // Only set guest_email if user_id is not provided (guest checkout)
          guest_email: payload.user_id ? null : (payload.buyer_email || null),
          visible_in_history: false
        })
        .select('id')
        .single();

      if (orderError) {
        console.error("❌ Failed to create order:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      finalOrderId = orderData.id;
      console.log("✅ Order created successfully:", finalOrderId);
    } else if (!finalOrderId) {
      // If order_id is not provided and create_order is false, warn but continue
      console.warn("⚠️ No order_id provided and create_order is false. Payment will be created without order link.");
    }

    // Create payment record in database first
    const paymentToken = crypto.randomUUID();
    console.log("Creating payment record with token:", paymentToken);
    
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: payload.user_id || null,
        event_id: payload.event_id,
        order_id: finalOrderId || null,  // ✅ CRITICAL: Link payment to order (created or provided)
        amount: payload.amount_major,
        currency: payload.currency,
        status: "pending",
        payment_method: payload.method,
        provider: "pawapay",  // Set provider to pawapay
        token: paymentToken
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Database payment insert error:", paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    console.log("Payment record created:", paymentRecord.id);

    // Prepare pawaPay request
    const baseUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://temba.com";
    const callbackUrl = `${supabaseUrl}/functions/v1/pawapay-webhook`;
    const returnUrl = payload.return_url || `${baseUrl}/payment/success?order_id=${finalOrderId || ''}&token=${paymentToken}`;
    const cancelUrl = payload.cancel_url || `${baseUrl}/payment/cancelled?order_id=${finalOrderId || ''}`;

    // Map provider names to pawaPay format
    // Based on pawaPay API docs: https://docs.pawapay.io/v2/docs/providers
    // Correct provider code for Orange Money in Burkina Faso is ORANGE_BFA
    const providerMapping: Record<string, string> = {
      'orange': 'ORANGE_BFA',  // Correct format per pawaPay docs
      'orange-money-bf': 'ORANGE_BFA',
      'orange-money': 'ORANGE_BFA',
      'mtn': 'MTN_MOMO_ZMB',  // Example from pawaPay docs (for Zambia)
      'mtn-mobile-money': 'MTN_MOMO_ZMB',
      'moov': 'MOOV_BFA',  // Try MOOV_BFA for Burkina Faso
      'moov-money': 'MOOV_BFA',
      'wave': 'WAVE',
    };

    let pawapayProvider = providerMapping[payload.provider.toLowerCase()] || payload.provider.toUpperCase().replace(/-/g, '_');
    
    console.log("🔍 Provider mapping:", {
      input: payload.provider,
      mapped: pawapayProvider,
      note: "Using pawaPay official provider codes from https://docs.pawapay.io/v2/docs/providers"
    });

    // Format phone number for pawaPay: Only numbers are accepted.
    // No whitespaces, separators or prefixes like + or 0 are allowed.
    // Expected format: CountryCode + LocalNumber (e.g., 22675581026)
    let cleanedPhone = payload.phone.replace(/\D/g, ''); // Remove all non-digits
    
    // Ensure country code 226 is present for Burkina Faso
    // Local numbers are typically 8 digits (e.g., 75581026)
    if (!cleanedPhone.startsWith('226')) {
      // Remove any leading zeros from local number part
      cleanedPhone = cleanedPhone.replace(/^0+/, '');
      // Prepend country code
      cleanedPhone = '226' + cleanedPhone;
    } else {
      // Already has country code, but ensure no extra leading zeros after 226
      const afterCountryCode = cleanedPhone.substring(3);
      cleanedPhone = '226' + afterCountryCode;
    }
    
    const formattedPhone = cleanedPhone;
    // Validate BF phone length (226 + 8 digits = 11)
    if (!/^\d{11}$/.test(formattedPhone)) {
      throw new Error("Invalid phone format for pawaPay. Must include country code (e.g., 22675581026)");
    }
    
    console.log("📞 Formatted phone number for pawaPay:", formattedPhone);

    // Prepare pawaPay API v2 payload
    // According to pawaPay v2 API docs: https://docs.pawapay.io/v2/docs/how_to_start
    // Format matches payout structure but for deposits (receiving payments)
    // Amount should be string, not number or object
    const amountValue = Math.round(payload.amount_major).toString();
    
    // Use the mapped provider (should be ORANGE_BFA for Orange Money in Burkina Faso)
    let finalPaymentMethod = pawapayProvider;

    // pawaPay v2 deposits API payload format
    // Based on official API structure: depositId, amount (string), currency, payer with accountDetails
    // For ORANGE_BFA, preAuthorisationCode is required (OTP from *144*4*6#)
    const pawapayPayload: any = {
      depositId: paymentRecord.id, // Use payment ID as deposit ID
      amount: amountValue, // String format per pawaPay v2 API
      currency: payload.currency, // XOF
      payer: {
        type: "MMO", // Mobile Money Operator (was MSISDN)
        accountDetails: {
          phoneNumber: formattedPhone, // Phone in digits only (e.g., 22675581026)
          provider: finalPaymentMethod // e.g., ORANGE_BFA
        }
      }
    };
    
    // Pre-authorization code handling (v2):
    // ORANGE_BFA requires PREAUTH; collect OTP first or use Payment Page.
    const otpCode = payload.preAuthorisationCode || payload.pre_authorisation_code || payload.otpCode;
    const requiresOtp = finalPaymentMethod === 'ORANGE_BFA';
    if (requiresOtp && !otpCode) {
      // Prompt client to collect OTP via USSD with amount
      return new Response(
        JSON.stringify({
          status: "PRE_AUTH_REQUIRED",
          requires_otp: true,
          message: "Orange Money (BF) requiert un code OTP.",
          provider: finalPaymentMethod,
          instructions: {
            ussd_code_template: "*144*4*6*{amount}#",
            amount: amountValue,
            currency: payload.currency
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (otpCode) {
      pawapayPayload.preAuthorisationCode = otpCode;
      console.log("✅ Pre-authorization code provided:", otpCode.substring(0, 2) + "****");
    }
    
    // Note: pawaPay v2 deposits API does NOT support:
    // - 'description' field (must be removed)
    // - 'callbackUrl' field (must be configured in dashboard, not sent in request)
    // Callback URL should be set in pawaPay Dashboard, not in the request body

    console.log("🔒 Calling pawaPay API - Payment ID:", paymentRecord.id);
    console.log("📤 pawaPay Request Payload:", JSON.stringify(pawapayPayload, null, 2));

    // Use pawaPay API (production or sandbox)
    // According to official docs: https://docs.pawapay.io/v2/docs/how_to_start
    // Base URLs:
    // - Sandbox: https://api.sandbox.pawapay.io/
    // - Production: https://api.pawapay.io/
    // We use v2 API for deposits (receiving payments)
    const apiVersion = "v2";  // pawaPay uses v2 API
    const pawapayApiUrl = pawapayMode === "production" 
      ? `https://api.pawapay.io/${apiVersion}/deposits`  // Changed from .cloud to .io and /payments to /deposits
      : `https://api.sandbox.pawapay.io/${apiVersion}/deposits`;
    
    console.log("🔗 pawaPay API endpoint:", pawapayApiUrl, `(API version: ${apiVersion} per official docs)`);

    console.log("🚀 Using pawaPay API:", pawapayApiUrl, "Mode:", pawapayMode);

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${pawapayApiKey}`,
    };

    // Call pawaPay API
    const pawapayResponse = await fetch(pawapayApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(pawapayPayload)
    });

    const responseText = await pawapayResponse.text();
    console.log("📡 pawaPay API Response:", {
      status: pawapayResponse.status,
      statusText: pawapayResponse.statusText,
      headers: Object.fromEntries(pawapayResponse.headers.entries()),
      body: responseText.substring(0, 500) // First 500 chars for logging
    });

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse pawaPay response:", parseError);
      throw new Error(`Invalid response from pawaPay: ${responseText}`);
    }

    console.log("📥 pawaPay parsed response:", JSON.stringify(responseData, null, 2));

    // pawaPay v2 API returns depositId and status on success
    // Try multiple possible field names and nested structures
    const transactionId = 
      responseData.depositId || 
      responseData.deposit_id || 
      responseData.data?.depositId ||
      responseData.data?.deposit_id ||
      responseData.transactionId || 
      responseData.transaction_id ||
      responseData.id ||
      responseData.data?.id;

    console.log("🔍 Extracted transaction ID:", {
      transactionId,
      hasDepositId: !!responseData.depositId,
      hasDeposit_id: !!responseData.deposit_id,
      hasData: !!responseData.data,
      dataDepositId: responseData.data?.depositId,
      fullResponseKeys: Object.keys(responseData)
    });

    if (pawapayResponse.ok && transactionId) {
      // Map provider status (ACCEPTED, SUBMITTED, COMPLETED, FAILED) to our allowed statuses
      const providerStatus = (responseData.status || "").toUpperCase();
      let normalizedStatus: "pending" | "completed" | "failed" = "pending";

      if (providerStatus === "COMPLETED") {
        normalizedStatus = "completed";
      } else if (providerStatus === "FAILED") {
        normalizedStatus = "failed";
      } else {
        // ACCEPTED or SUBMITTED (or anything else) => keep as pending until webhook/verification completes
        normalizedStatus = "pending";
      }

      // Update payment record with pawaPay transaction ID
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          transaction_id: transactionId,
          status: normalizedStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentRecord.id);

      if (updateError) {
        console.error("❌ Failed to update payment with transaction ID:", updateError);
        throw new Error(`Failed to update payment record: ${updateError.message}`);
      }

      console.log("✅ pawaPay deposit created:", {
        payment_id: paymentRecord.id,
        transaction_id: transactionId,
        transaction_id_length: transactionId?.length,
        provider_status: providerStatus,
        normalized_status: normalizedStatus,
        sent_depositId: pawapayPayload.depositId,
        received_depositId: transactionId
      });
      // SUCCESS: Return deposit info (no redirect URL from deposits)
      return new Response(
        JSON.stringify({
          payment_id: paymentRecord.id,
          deposit_id: transactionId,
          order_id: finalOrderId,  // ✅ Include order_id (created or provided)
          order_created: createOrder && !payload.order_id,  // ✅ Indicate if order was created
          status: responseData.status // ACCEPTED | REJECTED | DUPLICATE_IGNORED | COMPLETED (webhook/poll will finalize)
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // No redirect expectations from deposits; if we reach here, return structured error

      // Don't delete payment record - keep for debugging
      // Update status to failed for reference
      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_message: JSON.stringify(responseData).substring(0, 500),
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentRecord.id);
      // HARD_ERROR: Extract detailed error information
      const errorMessage = responseData.message || 
                          responseData.error?.message || 
                          responseData.error || 
                          responseData.failureReason?.failureMessage ||
                          responseData.errors?.map((e: any) => e.message || e).join(", ") ||
                          "Payment could not be created. Please try again.";
      
      // Log FULL request details for support ticket
      console.error("❌ pawaPay API error response:", {
        status: pawapayResponse.status,
        statusText: pawapayResponse.statusText,
        responseData: responseData,
        fullResponse: responseText,
        requestPayload: pawapayPayload,
        endpoint: pawapayApiUrl,
        headers: Object.keys(headers)
      });
      
      // For UNKNOWN_ERROR, provide helpful guidance
      if (responseData.failureReason?.failureCode === "UNKNOWN_ERROR") {
        console.error("⚠️ UNKNOWN_ERROR from pawaPay - Common causes:");
        console.error("1. Account not fully activated/KYC not completed");
        console.error("2. Webhook URL not configured in pawaPay dashboard");
        console.error("3. Wrong API endpoint version");
        console.error("4. Wrong payment method format");
        console.error("5. Missing or invalid API credentials");
        console.error("💡 Contact pawaPay support with this payment ID:", paymentRecord.id);
      }
      
      // Return structured error response
      return new Response(
        JSON.stringify({
          status: "ERROR",
          message: errorMessage
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

  } catch (error) {
    console.error("Payment creation error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create payment",
        details: error.stack || null
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

