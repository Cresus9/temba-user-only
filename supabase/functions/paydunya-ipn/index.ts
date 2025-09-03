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
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for required environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const payload: PaydunyaIPN = await req.json();
    console.log("Received Paydunya IPN:", payload);

    // Validate required fields
    if (!payload.invoice_token || !payload.status) {
      throw new Error("Missing required IPN fields");
    }

    // Find payment by transaction_id (Paydunya token)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", payload.invoice_token)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found for token:", payload.invoice_token);
      throw new Error("Payment not found");
    }

    // Determine new payment status
    let newStatus = "pending";
    if (payload.status === "completed") {
      newStatus = "completed";
    } else if (payload.status === "cancelled" || payload.status === "failed") {
      newStatus = "failed";
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        failed_at: newStatus === "failed" ? new Date().toISOString() : null,
        amount_paid: payload.invoice?.total_amount || payment.amount,
        ipn_data: payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    if (updateError) throw updateError;

    // If payment completed, update order and create tickets
    if (newStatus === "completed") {
      // Find the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", payload.invoice?.custom_data?.order_id || payment.event_id)
        .single();

      if (orderError) {
        console.error("Order not found:", orderError);
      } else {
        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "COMPLETED",
            updated_at: new Date().toISOString()
          })
          .eq("id", order.id);

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
                payment_id: payment.id
              });
            }
          }

          if (ticketInserts.length > 0) {
            const { error: ticketsError } = await supabase
              .from("tickets")
              .insert(ticketInserts);

            if (ticketsError) {
              console.error("Error creating tickets:", ticketsError);
            } else {
              console.log(`Created ${ticketInserts.length} tickets for order ${order.id}`);
            }
          }
        }
      }
    }

    // Log the IPN for audit purposes
    await supabase
      .from("payment_webhooks")
      .insert({
        provider: "paydunya",
        event_key: payload.invoice_token,
        raw: payload
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "IPN processed successfully",
        payment_id: payment.id,
        new_status: newStatus
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("IPN processing error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
