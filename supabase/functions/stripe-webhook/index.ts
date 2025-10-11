// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@17.3.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!sig) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }), 
      { status: 400, headers: cors }
    );
  }
  if (!webhookSecret) {
    return new Response(
      JSON.stringify({ error: "STRIPE_WEBHOOK_SECRET not configured" }), 
      { status: 500, headers: cors }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const rawBody = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { 
      apiVersion: "2024-06-20" 
    });

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ Signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }), 
        { status: 400, headers: cors }
      );
    }

    console.log("✅ Webhook verified:", event.type, event.id);

    // Log webhook (idempotent by event.id)
    const { data: webhookLog, error: logErr } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          provider: "stripe",
          event_type: event.type,
          event_key: event.id,
          raw_payload: event as any,
          processed: false,
          created_at: new Date().toISOString(),
        },
        { onConflict: "event_key", ignoreDuplicates: false }
      )
      .select("id")
      .maybeSingle();

    if (logErr) {
      console.warn("⚠️ Failed to log webhook:", logErr);
    }

    // Handle payment_intent.succeeded
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;

      // Find payment
      const { data: payment, error: selectErr } = await supabase
        .from("payments")
        .select("id, status, order_id, event_id, user_id")
        .eq("stripe_payment_intent_id", intent.id)
        .maybeSingle();

      if (selectErr || !payment) {
        console.warn("⚠️ Payment not found for intent:", intent.id);
        return new Response(
          JSON.stringify({ received: true, note: "Payment not found" }), 
          { headers: cors }
        );
      }

      // Idempotent: skip if already terminal
      if (["completed", "succeeded", "failed", "cancelled"].includes(payment.status)) {
        console.log("ℹ️ Payment already finalized:", payment.id, payment.status);
        if (webhookLog?.id) {
          await supabase
            .from("payment_webhooks")
            .update({ processed: true })
            .eq("id", webhookLog.id);
        }
        return new Response(
          JSON.stringify({ received: true, note: "Already processed" }), 
          { headers: cors }
        );
      }

      // Mark payment as completed
      const { error: updateErr } = await supabase
        .from("payments")
        .update({
          status: "completed",
          transaction_id: intent.id,
          stripe_payment_method_id: String(intent.payment_method ?? ""),
          completed_at: new Date().toISOString(),
          amount_paid: intent.amount_received / 100,
        })
        .eq("id", payment.id);

      if (updateErr) {
        console.error("❌ Failed to update payment:", updateErr);
        throw updateErr;
      }

      console.log("✅ Payment completed:", payment.id);

      // Update order and create tickets if order exists
      if (payment.order_id) {
        // Fetch order details
        const { data: order, error: orderFetchErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", payment.order_id)
          .maybeSingle();

        if (orderFetchErr || !order) {
          console.error("❌ Failed to fetch order:", orderFetchErr);
        } else {
          // Update order status
          const { error: orderErr } = await supabase
            .from("orders")
            .update({
              status: "COMPLETED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.order_id);

          if (orderErr) {
            console.error("❌ Failed to update order:", orderErr);
          } else {
            console.log("✅ Order completed:", payment.order_id);
          }

          // Check if tickets already exist to prevent duplicates
          const { data: existingTickets, error: existingTicketsError } = await supabase
            .from("tickets")
            .select("id")
            .eq("order_id", payment.order_id);

          if (existingTicketsError) {
            console.error("❌ Error checking existing tickets:", existingTicketsError);
          } else if (existingTickets && existingTickets.length > 0) {
            console.log(`ℹ️ Tickets already exist for order ${payment.order_id} (${existingTickets.length} tickets), skipping ticket creation`);
          } else {
            // Create tickets for the order (same logic as PayDunya)
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
            } else {
              console.warn("⚠️ Order has no ticket_quantities:", payment.order_id);
            }
          }
        }
      }

      // Mark webhook as processed
      if (webhookLog?.id) {
        await supabase
          .from("payment_webhooks")
          .update({ processed: true })
          .eq("id", webhookLog.id);
      }

      return new Response(
        JSON.stringify({ 
          received: true, 
          payment_id: payment.id, 
          status: "completed" 
        }), 
        { headers: cors }
      );
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;

      const { error: failErr } = await supabase
        .from("payments")
        .update({
          status: "failed",
          transaction_id: intent.id,
          failed_at: new Date().toISOString(),
          metadata: {
            failure_code: intent.last_payment_error?.code,
            failure_message: intent.last_payment_error?.message,
          },
        })
        .eq("stripe_payment_intent_id", intent.id);

      if (failErr) {
        console.error("❌ Failed to update payment as failed:", failErr);
      } else {
        console.log("✅ Payment marked as failed:", intent.id);
      }

      if (webhookLog?.id) {
        await supabase
          .from("payment_webhooks")
          .update({ processed: true })
          .eq("id", webhookLog.id);
      }

      return new Response(
        JSON.stringify({ received: true, status: "failed" }), 
        { headers: cors }
      );
    }

    // Other events (log only)
    console.log("ℹ️ Unhandled event type:", event.type);
    return new Response(
      JSON.stringify({ received: true, note: "Event type not handled" }), 
      { headers: cors }
    );

  } catch (e: any) {
    console.error("❌ Webhook error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Internal error" }), 
      { status: 500, headers: cors }
    );
  }
});

