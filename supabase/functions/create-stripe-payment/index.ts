// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@17.3.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type CreatePaymentBody = {
  // Simple mode (for testing) - will auto-convert XOF to USD
  amount?: number;
  currency?: string;
  amount_is_minor?: boolean;
  
  // Advanced mode (for production) - with pre-calculated FX
  display_amount_minor?: number;      // e.g., 5000 (XOF)
  display_currency?: string;          // 'XOF' (default)
  charge_amount_minor?: number;       // e.g., 303 (USD cents)
  charge_currency?: string;           // 'USD' (default)
  
  // FX details (from fx-quote)
  fx_num?: number;
  fx_den?: number;
  fx_locked_at?: string;
  fx_margin_bps?: number;
  
  // Order details
  user_id?: string | null;
  event_id: string;
  order_id?: string | null;
  description?: string | null;
  idempotencyKey?: string | null;
  
  // Order creation data (new)
  create_order?: boolean;
  ticket_quantities?: { [key: string]: number };
  payment_method?: string;
  guest_email?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body: CreatePaymentBody = await req.json();
    
    const {
      // Simple mode
      amount,
      currency = 'XOF',
      amount_is_minor = false,
      
      // Advanced mode
      display_amount_minor,
      display_currency = 'XOF',
      charge_amount_minor,
      charge_currency = 'USD',
      fx_num,
      fx_den,
      fx_locked_at,
      fx_margin_bps = 150,
      
      user_id,
      event_id,
      order_id,
      description,
      idempotencyKey,
      
      // Order creation data
      create_order = false,
      ticket_quantities,
      payment_method,
      guest_email,
    } = body;

    // Determine mode and validate
    const isSimpleMode = amount !== undefined && currency;
    const isAdvancedMode = display_amount_minor && charge_amount_minor && fx_num && fx_den && fx_locked_at;
    
    if (!event_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: event_id" }), 
        { status: 400, headers: cors }
      );
    }
    
    if (!isSimpleMode && !isAdvancedMode) {
      return new Response(
        JSON.stringify({ 
          error: "Either provide (amount, currency) for simple mode, or (display_amount_minor, charge_amount_minor, fx_num, fx_den, fx_locked_at) for advanced mode" 
        }), 
        { status: 400, headers: cors }
      );
    }

    // Handle simple mode with auto-conversion
    let finalDisplayAmount: number;
    let finalDisplayCurrency: string;
    let finalChargeAmount: number;
    let finalChargeCurrency: string;
    let finalFxNum: number;
    let finalFxDen: number;
    let finalFxLockedAt: string;
    
    if (isSimpleMode) {
      console.log("🔵 Simple mode: auto-converting", currency, "to USD");
      
      const normalizedCurrency = currency.toUpperCase();
      const rawAmount = amount_is_minor ? amount : Math.round(amount * 100);
      
      // Simple XOF to USD conversion (1 USD = 566 XOF + 1.5% margin)
      if (normalizedCurrency === 'XOF') {
        const baseXofPerUsd = 566; // Current market rate as of 2024
        const marginMultiplier = 1.015; // 1.5% margin
        const effectiveXofPerUsd = Math.round(baseXofPerUsd * marginMultiplier);
        
        // Sanity guard: expected band for XOF/USD
        if (baseXofPerUsd < 300 || baseXofPerUsd > 1000) {
          throw new Error(`FX source out of bounds: ${baseXofPerUsd} XOF/USD`);
        }
        
        const usdCents = Math.max(1, Math.round((rawAmount * 100) / effectiveXofPerUsd));
        
        // Safety rail: verify the implied rate is reasonable
        const implied = (rawAmount * 100) / usdCents;
        if (implied < 300 || implied > 1000) {
          throw new Error(`Implied FX out of bounds: ${implied.toFixed(2)} XOF/USD`);
        }
        
        finalDisplayAmount = rawAmount;
        finalDisplayCurrency = 'XOF';
        finalChargeAmount = usdCents;
        finalChargeCurrency = 'USD';
        finalFxNum = 100;
        finalFxDen = effectiveXofPerUsd;
        finalFxLockedAt = new Date().toISOString();
      } else {
        // For other currencies, use as-is
        finalDisplayAmount = rawAmount;
        finalDisplayCurrency = normalizedCurrency;
        finalChargeAmount = rawAmount;
        finalChargeCurrency = normalizedCurrency;
        finalFxNum = 1;
        finalFxDen = 1;
        finalFxLockedAt = new Date().toISOString();
      }
    } else {
      // Advanced mode - use provided values
      finalDisplayAmount = display_amount_minor!;
      finalDisplayCurrency = display_currency!;
      finalChargeAmount = charge_amount_minor!;
      finalChargeCurrency = charge_currency!;
      finalFxNum = fx_num!;
      finalFxDen = fx_den!;
      finalFxLockedAt = fx_locked_at!;
    }

    console.log("🔵 Creating Stripe payment with FX:", {
      display: `${finalDisplayAmount} ${finalDisplayCurrency}`,
      charge: `${finalChargeAmount} cents ${finalChargeCurrency}`,
      fx_rate: `1 ${finalChargeCurrency} = ${finalFxDen / finalFxNum} ${finalDisplayCurrency}`,
      event_id,
      order_id,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create order if requested (to bypass RLS in production)
    let finalOrderId = order_id;
    if (create_order && !order_id && ticket_quantities && payment_method) {
      console.log("🔵 Creating order via Edge Function (bypassing RLS)");
      
      // Calculate total amount from ticket quantities
      const { data: ticketTypes } = await supabase
        .from('ticket_types')
        .select('id, price')
        .in('id', Object.keys(ticket_quantities));

      if (!ticketTypes || ticketTypes.length === 0) {
        throw new Error('Ticket types not found');
      }

      const totalAmount = ticketTypes.reduce((sum, ticket) => {
        const quantity = ticket_quantities[ticket.id] || 0;
        return sum + (ticket.price * quantity);
      }, 0);

      console.log("🔵 Order total calculated:", totalAmount);

      // Create order using service role (bypasses RLS)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user_id || null,
          event_id: event_id,
          total: totalAmount,
          status: 'AWAITING_PAYMENT',
          payment_method: payment_method,
          ticket_quantities: ticket_quantities,
          guest_email: guest_email || null,
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
    }

    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("idempotency_keys")
        .select("key, payment_id")
        .eq("key", idempotencyKey)
        .maybeSingle();

      if (existing?.payment_id) {
        console.log("⚠️ Duplicate request detected:", idempotencyKey);
        
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id, stripe_payment_intent_id, token, order_id")
          .eq("id", existing.payment_id)
          .maybeSingle();

        if (existingPayment?.stripe_payment_intent_id) {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { 
            apiVersion: "2024-06-20" 
          });
          const intent = await stripe.paymentIntents.retrieve(
            existingPayment.stripe_payment_intent_id
          );
          
          console.log("✅ Returning existing payment:", existingPayment.id);
          return new Response(
            JSON.stringify({ 
              clientSecret: intent.client_secret, 
              paymentId: existingPayment.id,
              orderId: existingPayment.order_id,
              paymentToken: existingPayment.token,
              duplicate: true 
            }), 
            { headers: cors }
          );
        }
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { 
      apiVersion: "2024-06-20" 
    });

    // Create Stripe PaymentIntent with final currency
    console.log("🔷 Creating Stripe PaymentIntent...");
    const intent = await stripe.paymentIntents.create(
      {
        amount: finalChargeAmount,
        currency: finalChargeCurrency.toLowerCase(),
        description: description ?? `Event ticket purchase - ${event_id}`,
        metadata: {
          user_id: user_id ?? "guest",
          event_id,
          order_id: order_id ?? "",
          provider: "stripe",
          platform: "temba",
          display_amount: String(finalDisplayAmount),
          display_currency: finalDisplayCurrency,
          charge_amount: String(finalChargeAmount),
          charge_currency: finalChargeCurrency,
          fx_rate: `${finalFxNum}/${finalFxDen}`,
          fx_locked_at: finalFxLockedAt,
          fx_margin_bps: String(fx_margin_bps),
        },
        automatic_payment_methods: { enabled: true },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    console.log("✅ PaymentIntent created:", intent.id);

    // Create payment record with both amounts AND order_id
    const paymentToken = `stripe-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: paymentRow, error: insertErr } = await supabase
      .from("payments")
      .insert({
        user_id: user_id ?? null,
        event_id,
        order_id: finalOrderId ?? null, // ✅ FIXED: Use finalOrderId (created or provided)
        token: paymentToken,
        
        // Legacy fields (for backward compatibility)
        amount: finalDisplayAmount,
        currency: finalDisplayCurrency,
        
        // New FX tracking fields
        display_currency: finalDisplayCurrency,
        display_amount_minor: finalDisplayAmount,
        charge_currency: finalChargeCurrency,
        charge_amount_minor: finalChargeAmount,
        fx_rate_numerator: finalFxNum,
        fx_rate_denominator: finalFxDen,
        fx_locked_at: finalFxLockedAt,
        fx_margin_bps,
        
        // Stripe fields
        status: "pending",
        provider: "stripe",
        payment_method: "credit_card",
        stripe_payment_intent_id: intent.id,
        
        // Metadata (for additional info)
        metadata: { 
          description, 
          intent_status: intent.status,
          fx_rate_display: `1 ${finalChargeCurrency} = ${(finalFxDen / finalFxNum).toFixed(2)} ${finalDisplayCurrency}`,
        },
      })
      .select("id, token, order_id")
      .single();

    if (insertErr || !paymentRow) {
      console.error("❌ Failed to create payment record:", insertErr);
      console.error("❌ Insert error details:", JSON.stringify(insertErr, null, 2));
      throw new Error(`Failed to create payment record in database: ${JSON.stringify(insertErr)}`);
    }

    console.log("✅ Payment record created:", paymentRow.id);

    // Store idempotency key
    if (idempotencyKey) {
      await supabase
        .from("idempotency_keys")
        .upsert(
          { key: idempotencyKey, payment_id: paymentRow.id }, 
          { onConflict: "key" }
        );
      console.log("✅ Idempotency key stored");
    }

    console.log("🎉 Payment creation successful");
    return new Response(
      JSON.stringify({ 
        clientSecret: intent.client_secret, 
        paymentId: paymentRow.id,
        paymentToken: paymentRow.token, // ✅ FIXED: Return token for redirect
        orderId: finalOrderId, // ✅ FIXED: Return finalOrderId (created or provided)
        status: intent.status,
        display_amount: `${finalDisplayAmount.toLocaleString('fr-FR')} ${finalDisplayCurrency}`,
        charge_amount: `${finalChargeCurrency === 'USD' ? '$' : ''}${(finalChargeAmount / 100).toFixed(2)} ${finalChargeCurrency}`,
        fx_rate: `${finalFxDen / finalFxNum}`,
        order_created: create_order && !order_id, // Indicate if order was created
      }), 
      { headers: cors }
    );

  } catch (e: any) {
    console.error("❌ create-stripe-payment error:", e.message);
    console.error("Stack:", e.stack);
    
    return new Response(
      JSON.stringify({ 
        error: e?.message ?? "Internal server error",
        type: e?.type ?? "unknown_error"
      }), 
      { status: 500, headers: cors }
    );
  }
});
