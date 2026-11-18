// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@17.3.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import {
  redisSetNx,
  redisSet,
  qstashPublish,
  webhookDedupKey,
  paymentStatusKey,
  PAYMENT_STATUS_TTL,
  WEBHOOK_DEDUP_TTL,
} from "../_shared/upstash.ts";
import { sendMetaPurchase } from "../_shared/metaCapi.ts";
import { stampTicketVisitDates, ticketLinesForOrder } from "../_shared/ticketLines.ts";

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

  const supabase       = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const finalizeUrl    = `${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-order`;
  const finalizeSecret = Deno.env.get("FINALIZE_ORDER_SECRET") ?? "";
  const anonKey        = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    const rawBody = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { 
      apiVersion: "2024-06-20" 
    });

    // Verify signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
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

    // ── Redis dedup: drop re-deliveries of the same Stripe event ─────────────
    const isNew = await redisSetNx(webhookDedupKey("stripe", event.id), "1", WEBHOOK_DEDUP_TTL);
    if (isNew === false) {
      console.log("ℹ️ Duplicate Stripe event, skipping:", event.id);
      return new Response(JSON.stringify({ received: true, note: "duplicate" }), { headers: cors });
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
        if (payment.status === "completed" || payment.status === "succeeded") {
          await sendMetaPurchase(supabase, payment.id);
          triggerTicketEmail(payment.id);
        }
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

      // ── Write Redis status key → mobile polling resolves instantly ────────
      await redisSet(paymentStatusKey(payment.id), "completed", PAYMENT_STATUS_TTL);

      // ── Try async finalization via QStash (5 retries) ─────────────────────
      const queued = await qstashPublish(
        finalizeUrl,
        { payment_id: payment.id, provider: "stripe" },
        {
          dedupId: `stripe-finalize-${payment.id}`,
          retries: 5,
          forwardHeaders: {
            "X-Finalize-Secret": finalizeSecret,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      // ── Sync fallback: if QStash unavailable, finalize inline ────────────
      if (!queued && payment.order_id) {
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
              visible_in_history: true,
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
            try {
              await stampTicketVisitDates(supabase, payment.order_id);
            } catch (stampErr) {
              console.error("[stripe-webhook] visit date stamp:", stampErr);
            }
          } else {
            // Create tickets for the order (same logic as PayDunya)
            if (order.ticket_quantities) {
              const ticketInserts = [];
              // One entry per (ticket type, date); single-date orders: ticket_quantities + order date as before.
              const ticketLines = await ticketLinesForOrder(supabase, order);

              for (const line of ticketLines) {
                for (let i = 0; i < line.quantity; i++) {
                  ticketInserts.push({
                    order_id: order.id,
                    event_id: order.event_id,
                    user_id: order.user_id,
                    ticket_type_id: line.ticket_type_id,
                    event_date_id: line.event_date_id || null,
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
                  console.error("❌ Error creating tickets — queuing for retry:", ticketsError);
                  // Upsert a finalize job so process-finalize-jobs picks it up
                  const { error: jobErr } = await supabase
                    .from("payment_finalize_jobs")
                    .upsert(
                      {
                        payment_id: payment.id,
                        provider: "stripe",
                        status: "pending",
                        last_error: ticketsError.message,
                        updated_at: new Date().toISOString(),
                      },
                      { onConflict: "payment_id", ignoreDuplicates: false }
                    );
                  if (jobErr) {
                    console.error("❌ Failed to queue finalize job:", jobErr);
                  } else {
                    console.log("⏳ Finalize job queued for payment:", payment.id);
                  }
                } else {
                  console.log(`✅ Created ${ticketInserts.length} tickets for order ${order.id}`);
                }
              }
            } else {
              console.warn("⚠️ Order has no ticket_quantities:", payment.order_id);
            }
          }
        }
      } // end sync fallback

      if (!queued) await sendMetaPurchase(supabase, payment.id);
      if (!queued) triggerTicketEmail(payment.id);

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

      const { data: failedRows, error: failErr } = await supabase
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
        .eq("stripe_payment_intent_id", intent.id)
        .not("status", "in", "(completed,COMPLETED,paid,PAID)")
        .select("id, order_id");

      if (failErr) {
        console.error("❌ Failed to update payment as failed:", failErr);
      } else if (!failedRows?.length) {
        console.log("[stripe-webhook] refused to downgrade a completed payment", intent.id);
      } else {
        console.log("✅ Payment marked as failed:", intent.id);
        const failedPayment = failedRows[0];

        if (failedPayment?.id) {
          await redisSet(paymentStatusKey(failedPayment.id), "failed", PAYMENT_STATUS_TTL);
        }

        if (failedPayment?.order_id) {
          const { data: cancelled, error: orderFailErr } = await supabase
            .from("orders")
            .update({
              status: "CANCELLED",
              visible_in_history: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", failedPayment.order_id)
            .not("status", "in", "(COMPLETED,paid,PAID)")
            .select("id");

          if (orderFailErr) {
            console.error("❌ Failed to mark order as cancelled:", orderFailErr);
          } else if (!cancelled?.length) {
            console.log("[stripe-webhook] kept completed order", failedPayment.order_id);
          }
        }
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

    // A full refund does not change ticket issuance. It writes a reversal row
    // when the ledger function is installed. A partial refund leaves the reward.
    // Missing SQL must not fail the webhook.
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const amount = charge.amount ?? 0;
      const amountRefunded = charge.amount_refunded ?? 0;
      const fullyRefunded = charge.refunded === true || (amount > 0 && amountRefunded >= amount);
      if (!fullyRefunded) {
        console.log("[stripe-webhook] partial refund, rewards left in place");
        return new Response(
          JSON.stringify({ received: true, status: "partial_refund" }),
          { headers: cors },
        );
      }
      const paymentIntent = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
      if (paymentIntent) {
        const { data: refundedPayment } = await supabase
          .from("payments")
          .select("order_id")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();
        if (refundedPayment?.order_id) {
          const { error: reverseErr } = await supabase.rpc("reverse_order_rewards", {
            p_order_id: refundedPayment.order_id,
            p_reason: "stripe_refund",
          });
          if (reverseErr) console.warn("[stripe-webhook] reversal:", reverseErr.message);
        }
      }
      return new Response(
        JSON.stringify({ received: true, status: "refunded" }),
        { headers: cors },
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

