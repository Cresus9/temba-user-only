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

type CreateBody = {
  amount: number;              // major units (e.g., 10.50 USD) OR minor; see flag below
  currency: string;            // ISO 4217 code (e.g., 'usd', 'eur', 'xof')
  user_id?: string | null;
  event_id: string;
  order_id?: string | null;
  description?: string | null;
  idempotencyKey?: string | null;
  amount_is_minor?: boolean;   // set true if client already sends minor units
};

// Valid currency codes (add more as needed)
const VALID_CURRENCIES = new Set([
  'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'cny', 'inr',
  'xof', 'xaf', 'ghs', 'ngn', 'kes', 'zar', 'mad', 'egp'
]);

// XOF conversion (Stripe doesn't support XOF natively)
const CURRENCY_CONVERSION_RATES: Record<string, number> = {
  xof_to_usd: 0.00167,  // 1 XOF = 0.00167 USD (1 USD ≈ 600 XOF)
  xof_to_eur: 0.00152,  // 1 XOF = 0.00152 EUR (1 EUR ≈ 655 XOF)
  xaf_to_usd: 0.00167,  // Same as XOF (fixed rate)
};

function convertToStripeCurrency(amount: number, fromCurrency: string): {
  amount: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  conversionRate: number;
} {
  const from = fromCurrency.toLowerCase();
  
  // If currency is already supported by Stripe, no conversion needed
  if (['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'].includes(from)) {
    return {
      amount,
      currency: from,
      originalAmount: amount,
      originalCurrency: fromCurrency.toUpperCase(),
      conversionRate: 1,
    };
  }
  
  // Convert XOF/XAF to USD
  if (from === 'xof' || from === 'xaf') {
    const rate = CURRENCY_CONVERSION_RATES[`${from}_to_usd`];
    const convertedAmount = Math.round(amount * rate * 100) / 100;
    return {
      amount: convertedAmount,
      currency: 'usd',
      originalAmount: amount,
      originalCurrency: fromCurrency.toUpperCase(),
      conversionRate: rate,
    };
  }
  
  // Default: use USD
  console.warn(`⚠️ Currency ${fromCurrency} not supported, using USD with 1:1 rate`);
  return {
    amount,
    currency: 'usd',
    originalAmount: amount,
    originalCurrency: fromCurrency.toUpperCase(),
    conversionRate: 1,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Parse request body
    let body: CreateBody;
    try {
      body = await req.json();
    } catch {
      console.error("❌ Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }), 
        { status: 400, headers: cors }
      );
    }

    const { 
      amount, 
      currency, 
      user_id, 
      event_id, 
      order_id, 
      description, 
      idempotencyKey, 
      amount_is_minor 
    } = body;

    // Validate required fields
    if (typeof amount !== "number" || !currency || !event_id) {
      console.error("❌ Missing required fields:", { amount, currency, event_id });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: amount (number), currency, event_id" 
        }), 
        { status: 400, headers: cors }
      );
    }

    // Normalize and validate currency
    const normalizedCurrency = String(currency).toLowerCase().trim();
    if (!VALID_CURRENCIES.has(normalizedCurrency)) {
      console.error("❌ Invalid currency:", normalizedCurrency);
      return new Response(
        JSON.stringify({ 
          error: `Invalid currency: ${normalizedCurrency}. Must be a valid ISO 4217 code.` 
        }), 
        { status: 400, headers: cors }
      );
    }

    // Convert currency if needed (XOF → USD for Stripe)
    const converted = convertToStripeCurrency(amount, normalizedCurrency);
    console.log("💱 Currency conversion:", {
      from: `${amount} ${converted.originalCurrency}`,
      to: `${converted.amount} ${converted.currency.toUpperCase()}`,
      rate: converted.conversionRate
    });

    // Convert to Stripe minor units (cents, etc.)
    const amountInMinor = amount_is_minor ? Math.round(converted.amount) : Math.round(converted.amount * 100);
    if (amountInMinor <= 0) {
      console.error("❌ Invalid amount:", amountInMinor);
      return new Response(
        JSON.stringify({ error: "amount must be > 0" }), 
        { status: 400, headers: cors }
      );
    }

    console.log("🔵 Creating Stripe payment:", {
      amountInMinor,
      currency: converted.currency,
      originalAmount: converted.originalAmount,
      originalCurrency: converted.originalCurrency,
      user_id: user_id ?? "guest",
      event_id,
      order_id,
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for duplicate request (idempotency)
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
          .select("id, stripe_payment_intent_id")
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

    // Create Stripe PaymentIntent
    console.log("🔷 Creating Stripe PaymentIntent...");
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountInMinor,
        currency: converted.currency,
        description: description ?? `Event ticket purchase - ${event_id}`,
        metadata: {
          user_id: user_id ?? "guest",
          event_id,
          order_id: order_id ?? "",
          provider: "stripe",
          platform: "temba",
          original_amount: String(converted.originalAmount),
          original_currency: converted.originalCurrency,
          conversion_rate: String(converted.conversionRate),
        },
        automatic_payment_methods: { enabled: true },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    console.log("✅ PaymentIntent created:", intent.id);

    // Create payment record in database
    const { data: paymentRow, error: insertErr } = await supabase
      .from("payments")
      .insert({
        user_id: user_id ?? null,
        event_id,
        order_id: order_id ?? null,
        amount: converted.originalAmount, // Store ORIGINAL XOF amount
        currency: converted.originalCurrency, // Store original currency (XOF)
        status: "pending",
        provider: "stripe",
        payment_method: "credit_card",
        stripe_payment_intent_id: intent.id,
        metadata: { 
          order_id, 
          description, 
          intent_status: intent.status, 
          amount_in_minor: amountInMinor,
          stripe_amount: converted.amount, // Converted amount (USD)
          stripe_currency: converted.currency.toUpperCase(), // USD
          conversion_rate: converted.conversionRate,
          was_converted: converted.conversionRate !== 1,
        },
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !paymentRow) {
      console.error("❌ Failed to create payment record:", insertErr);
      throw new Error("Failed to create payment record in database");
    }

    console.log("✅ Payment record created:", paymentRow.id);

    // Store idempotency key atomically
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
        status: intent.status 
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

