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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Create payment function started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paydunyaMasterKey = Deno.env.get("PAYDUNYA_MASTER_KEY");
    const paydunyaPrivateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY");
    const paydunyaPublicKey = Deno.env.get("PAYDUNYA_PUBLIC_KEY");
    const paydunyaToken = Deno.env.get("PAYDUNYA_TOKEN");
    const paydunyaMode = Deno.env.get("PAYDUNYA_MODE") || "test";

    console.log("Environment check:", {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      paydunyaMasterKey: !!paydunyaMasterKey,
      paydunyaPrivateKey: !!paydunyaPrivateKey,
      paydunyaPublicKey: !!paydunyaPublicKey,
      paydunyaToken: !!paydunyaToken,
      paydunyaMode: paydunyaMode
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaPublicKey || !paydunyaToken) {
      throw new Error("Paydunya configuration missing. Please configure all Paydunya API keys in Supabase secrets.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let payload: CreatePaymentRequest;
    try {
      const requestBody = await req.text();
      console.log("Raw request body:", requestBody);
      
      payload = JSON.parse(requestBody);
      console.log("Payment request payload:", {
        idempotency_key: payload.idempotency_key,
        event_id: payload.event_id,
        amount_major: payload.amount_major,
        currency: payload.currency,
        method: payload.method,
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
    if (!payload.description) {
      throw new Error("Missing required field: description");
    }

    // Get user email for Paydunya
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

    // Create payment record in database first
    const paymentToken = crypto.randomUUID();
    console.log("Creating payment record with token:", paymentToken);
    
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: payload.user_id || null,
        event_id: payload.event_id,
        amount: payload.amount_major,
        currency: payload.currency,
        status: "pending",
        payment_method: payload.method,
        token: paymentToken
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Database payment insert error:", paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    console.log("Payment record created:", paymentRecord.id);

    // Prepare Paydunya request
    const baseUrl = req.headers.get("origin") || "https://temba.com";
    const paydunyaPayload = {
      invoice: {
        total_amount: payload.amount_major,
        description: payload.description,
        return_url: payload.return_url || `${baseUrl}/payment/success?order=${payload.event_id}&token=PLACEHOLDER_TOKEN`,
        cancel_url: payload.cancel_url || `${baseUrl}/payment/cancelled?order=${payload.event_id}`,
        callback_url: `${supabaseUrl}/functions/v1/paydunya-ipn`
      },
      store: {
        name: "Temba",
        tagline: "Plateforme de Billetterie d'Événements",
        phone: "+226 74 75 08 15",
        postal_address: "Secteur 23, Zone 1, Section KC, Parcelle 09-10, Ouagadougou, Burkina Faso",
        website_url: baseUrl
      },
      custom_data: {
        order_id: payload.event_id,
        payment_id: paymentRecord.id,
        platform: "temba"
      }
    };

    console.log("Calling Paydunya API with payload:", JSON.stringify(paydunyaPayload, null, 2));

    // Determine Paydunya API URL based on mode
    const paydunyaApiUrl = paydunyaMode === "live" 
      ? "https://app.paydunya.com/api/v1/checkout-invoice/create"
      : "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create";

    console.log("Using Paydunya API URL:", paydunyaApiUrl, "Mode:", paydunyaMode);

    // Call Paydunya API
    const paydunyaResponse = await fetch(paydunyaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": paydunyaMasterKey,
        "PAYDUNYA-PRIVATE-KEY": paydunyaPrivateKey,
        "PAYDUNYA-PUBLIC-KEY": paydunyaPublicKey,
        "PAYDUNYA-TOKEN": paydunyaToken
      },
      body: JSON.stringify(paydunyaPayload)
    });

    const responseText = await paydunyaResponse.text();
    console.log("Paydunya raw response:", responseText);
    console.log("Paydunya response status:", paydunyaResponse.status);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Paydunya response:", parseError);
      throw new Error(`Invalid response from Paydunya: ${responseText}`);
    }

    console.log("Paydunya parsed response:", responseData);

    if (responseData.response_code === "00") {
      // Update payment record with Paydunya token
      const paydunyaToken = responseData.token || responseData.response_json?.invoice_token;
      const invoiceUrl = responseData.invoice_url || responseData.response_json?.invoice_url;

      await supabase
        .from("payments")
        .update({
          transaction_id: paydunyaToken,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentRecord.id);

      console.log("Payment created successfully:", {
        payment_id: paymentRecord.id,
        paydunya_token: paydunyaToken,
        invoice_url: invoiceUrl
      });

      // For test mode, if no invoice URL is provided, create a fallback
      let paymentUrl = invoiceUrl;
      if (!paymentUrl && paydunyaMode === "test") {
        // In test mode, redirect to success page directly with Paydunya token
        const orderParam = payload.order_id || payload.event_id;
        const tokenForUrl = paydunyaToken || `test_${paymentToken.slice(0, 10)}`;
        paymentUrl = `${baseUrl}/payment/success?order=${orderParam}&token=${tokenForUrl}`;
        console.log("Using fallback payment URL for test mode:", paymentUrl);
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: paymentUrl,
          payment_token: paydunyaToken || `test_${paymentToken.slice(0, 10)}`,
          payment_id: paymentRecord.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Delete payment record if Paydunya request failed
      await supabase.from("payments").delete().eq("id", paymentRecord.id);
      
      const errorMessage = responseData.response_text || responseData.description || "Payment creation failed";
      console.error("Paydunya API error:", errorMessage);
      throw new Error(`Paydunya API error: ${errorMessage}`);
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
