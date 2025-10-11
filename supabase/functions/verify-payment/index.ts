import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyPaymentRequest {
  payment_token: string;
  order_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for required environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paydunyaMasterKey = Deno.env.get("PAYDUNYA_MASTER_KEY");
    const paydunyaPrivateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY");
    const paydunyaPublicKey = Deno.env.get("PAYDUNYA_PUBLIC_KEY");
    const paydunyaToken = Deno.env.get("PAYDUNYA_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaPublicKey || !paydunyaToken) {
      throw new Error("Paydunya configuration missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const { payment_token, internal_token, order_id }: VerifyPaymentRequest = await req.json();
    console.log("Verifying payment:", { payment_token, internal_token, order_id });

    if ((!payment_token && !internal_token) || !order_id) {
      throw new Error("Missing payment token (payment_token or internal_token) or order ID");
    }

    // Get Paydunya configuration - FORCE LIVE MODE for production
    const paydunyaMode = Deno.env.get("PAYDUNYA_MODE") || "live";
    const PAYDUNYA_CONFIG = {
      masterKey: paydunyaMasterKey,
      privateKey: paydunyaPrivateKey,
      publicKey: paydunyaPublicKey,
      token: paydunyaToken,
      baseUrl: paydunyaMode === "live" 
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1"
    };

    console.log("Using Paydunya API URL:", PAYDUNYA_CONFIG.baseUrl, "Mode:", paydunyaMode);

    // Find payment in our database using either token type
    let payment, paymentError;
    
    if (internal_token) {
      // Use internal token (UUID) for database lookup - this is the preferred method
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("token", internal_token)
        .single();
      payment = result.data;
      paymentError = result.error;
      console.log("Looking up payment by internal_token:", internal_token);
    } else if (payment_token) {
      // Fallback: try to find by Paydunya token (stored in transaction_id field)
      const result = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", payment_token)
        .single();
      payment = result.data;
      paymentError = result.error;
      console.log("Looking up payment by payment_token:", payment_token);
    }

    if (paymentError || !payment) {
      console.error("Payment not found in database:", paymentError);
      throw new Error("Payment record not found");
    }

    console.log("Found payment record:", {
      payment_id: payment.id,
      provider: payment.provider,
      status: payment.status
    });

    // ✅ NEW: Handle Stripe payments differently
    if (payment.provider === "stripe") {
      console.log("🔷 Verifying Stripe payment...");
      
      // For Stripe, we can trust our webhook status
      // The webhook already verified the payment and created tickets
      if (payment.status === "completed" || payment.status === "succeeded") {
        console.log("✅ Stripe payment already verified by webhook");
        
        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            message: "Payment verified successfully (Stripe)",
            payment_id: payment.id,
            order_id: payment.order_id,
            provider: "stripe"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } else if (payment.status === "pending") {
        console.log("⏳ Stripe payment still pending webhook confirmation");
        
        return new Response(
          JSON.stringify({
            success: false,
            status: "pending",
            message: "Payment is being processed. Please wait...",
            payment_id: payment.id,
            order_id: payment.order_id,
            provider: "stripe"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } else {
        console.log("❌ Stripe payment failed or cancelled");
        
        return new Response(
          JSON.stringify({
            success: false,
            status: payment.status,
            message: `Payment ${payment.status}`,
            payment_id: payment.id,
            order_id: payment.order_id,
            provider: "stripe"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // PayDunya verification flow (existing logic)
    console.log("🔶 Verifying PayDunya payment...");
    const paydunyaTransactionToken = payment.transaction_id;
    if (!paydunyaTransactionToken) {
      throw new Error("Paydunya token not found in payment record");
    }

    console.log("PayDunya payment details:", {
      payment_id: payment.id,
      payment_token: payment.token,
      paydunya_token: paydunyaTransactionToken,
      status: payment.status
    });

    // Check payment status with Paydunya
    const response = await fetch(`${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/confirm/${paydunyaTransactionToken}`, {
      method: "GET",
      headers: {
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
        "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
        "PAYDUNYA-TOKEN": PAYDUNYA_CONFIG.token
      }
    });

    const paymentData = await response.json();
    console.log("Paydunya verification response:", paymentData);

    // Update payment status based on Paydunya response
    let status = "pending";
    if (paymentData.status === "completed") {
      status = "completed";
    } else if (paymentData.status === "cancelled" || paymentData.status === "failed") {
      status = "failed";
    }
    
    // 🎯 TEST MODE LOGIC: Treat pending payments as completed for immediate ticket generation
    if (paydunyaMode === "test" && status === "pending") {
      console.log("🎯 Test mode: Treating pending payment as completed for immediate ticket generation");
      status = "completed";
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        failed_at: status === "failed" ? new Date().toISOString() : null,
        amount_paid: paymentData.invoice?.total_amount || payment.amount,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    if (updateError) throw updateError;

    // If payment is completed, update order and create tickets (live mode)
    if (status === "completed") {
      console.log(`🎫 Processing completed payment for order ${order_id}, status: ${status}, mode: ${paydunyaMode}`);
      
      // Check if tickets already exist for this order to prevent duplicates
      const { data: existingTickets, error: existingTicketsError } = await supabase
        .from("tickets")
        .select("id")
        .eq("order_id", order_id);

      if (existingTicketsError) {
        console.error("Error checking existing tickets:", existingTicketsError);
      } else if (existingTickets && existingTickets.length > 0) {
        console.log(`🎫 Tickets already exist for order ${order_id} (${existingTickets.length} tickets), skipping ticket creation`);
        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            message: "Payment verified successfully - tickets already exist"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } else {
        console.log(`🎫 No existing tickets found for order ${order_id}, creating tickets...`);
        
        // Update order status
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            status: "COMPLETED",
            updated_at: new Date().toISOString()
          })
          .eq("id", order_id);

        if (orderUpdateError) {
          console.error("Error updating order:", orderUpdateError);
        }

        // Get order details to create tickets
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order_id)
          .single();

        if (!orderError && order?.ticket_quantities) {
          // Create tickets
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
                payment_id: payment.id
              });
            }
          }

          if (ticketInserts.length > 0) {
            console.log(`🎫 Creating ${ticketInserts.length} tickets for order ${order_id}`);
            const { data: createdTickets, error: ticketsError } = await supabase
              .from("tickets")
              .insert(ticketInserts)
              .select("id");

            if (ticketsError) {
              console.error("Error creating tickets:", ticketsError);
            } else {
              console.log(`🎫 Successfully created ${createdTickets?.length || ticketInserts.length} tickets for order ${order_id}`);
              if (createdTickets) {
                console.log(`🎫 Created ticket IDs:`, createdTickets.map(t => t.id));
              }
            }
          }
        }
      }
    }

    // 🎯 LIVE MODE RESPONSE: Include clear status indicators
    const responseMessage = status === "completed" 
      ? "🚀 Live Mode: Payment verified successfully" 
      : `Payment status: ${status}`;
    
    return new Response(
      JSON.stringify({
        success: status === "completed",
        status: status,
        payment_id: payment.id,
        order_id,
        test_mode: false, // Always false in live mode
        message: responseMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Payment verification error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Payment verification failed"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
