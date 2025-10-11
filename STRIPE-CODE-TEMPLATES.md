# Stripe Integration Code Templates
## Ready-to-use code snippets for implementation

---

## 1. Frontend: Stripe Context Provider

**File:** `src/context/StripeContext.tsx`

```typescript
import React, { createContext, useContext } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

interface StripeContextValue {
  stripePromise: Promise<Stripe | null>;
}

const StripeContext = createContext<StripeContextValue | undefined>(undefined);

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    appearance,
    locale: 'fr' as const, // French locale
  };

  return (
    <StripeContext.Provider value={{ stripePromise }}>
      <Elements stripe={stripePromise} options={options}>
        {children}
      </Elements>
    </StripeContext.Provider>
  );
}

export function useStripeContext() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripeContext must be used within StripeProvider');
  }
  return context;
}
```

---

## 2. Frontend: Stripe Card Input Component

**File:** `src/components/checkout/StripeCardInput.tsx`

```typescript
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface StripeCardInputProps {
  disabled?: boolean;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export default function StripeCardInput({
  disabled = false,
  onReady,
  onError,
}: StripeCardInputProps) {
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6366f1',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: true, // We collect this separately if needed
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    setCardError(event.error ? event.error.message : null);
    setCardBrand(event.brand || null);

    if (event.error) {
      onError?.(event.error.message);
    } else if (event.complete) {
      onReady?.();
    }
  };

  // Map Stripe brand names to display names
  const getBrandDisplayName = (brand: string | null) => {
    const brandMap: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brand ? brandMap[brand] || 'Carte' : null;
  };

  return (
    <div className="space-y-3">
      {/* Card Input */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de carte
        </label>
        <div
          className={`
            border rounded-lg p-4 transition-all
            ${cardError ? 'border-red-300 bg-red-50' : 'border-gray-200'}
            ${cardComplete ? 'border-green-300 bg-green-50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <CardElement
                options={cardElementOptions}
                onChange={handleCardChange}
              />
            </div>
            {cardComplete && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
          </div>
        </div>

        {/* Card Brand Indicator */}
        {cardBrand && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <span>Type de carte détecté:</span>
            <span className="font-medium">{getBrandDisplayName(cardBrand)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {cardError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{cardError}</p>
        </div>
      )}

      {/* Security Info */}
      <div className="text-xs text-gray-500 flex items-start gap-2">
        <svg
          className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Vos informations de paiement sont sécurisées et cryptées. 
          Nous n'enregistrons jamais les détails complets de votre carte.
        </span>
      </div>
    </div>
  );
}
```

---

## 3. Frontend: Updated Payment Service

**File:** `src/services/paymentService.ts` (additions)

```typescript
// Add these methods to the existing PaymentService class

/**
 * Create Stripe payment intent for card payments
 */
async createStripePayment(request: CreatePaymentRequest): Promise<StripePaymentResponse> {
  try {
    console.log('Creating Stripe payment:', request);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-stripe-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stripe payment error: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: data.success,
      clientSecret: data.client_secret,
      paymentId: data.payment_id,
      orderId: data.order_id,
    };
  } catch (error: any) {
    console.error('Stripe payment creation error:', error);
    throw error;
  }
}

/**
 * Verify Stripe payment status
 */
async verifyStripePayment(paymentIntentId: string): Promise<PaymentVerification> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: {
        stripe_payment_intent_id: paymentIntentId,
        provider: 'stripe',
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: data.success,
      status: data.status,
      payment_id: data.payment_id,
      order_id: data.order_id,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Stripe verification error:', error);
    throw error;
  }
}

/**
 * Universal payment creation that routes to appropriate provider
 */
async createPayment(request: CreatePaymentRequest): Promise<UnifiedPaymentResponse> {
  if (request.paymentMethod === 'MOBILE_MONEY') {
    // Existing PayDunya flow
    return this.createPaydunyaPayment(request);
  } else if (request.paymentMethod === 'CARD') {
    // New Stripe flow
    return this.createStripePayment(request);
  } else {
    throw new Error(`Unknown payment method: ${request.paymentMethod}`);
  }
}
```

---

## 4. Frontend: Updated CheckoutForm (Stripe Integration)

**File:** `src/components/checkout/CheckoutForm.tsx` (key additions)

```typescript
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import StripeCardInput from './StripeCardInput';

// Inside CheckoutForm component:

const stripe = useStripe();
const elements = useElements();
const [stripeReady, setStripeReady] = useState(false);

// Update handleSubmit for Stripe payments:

const handleStripePayment = async () => {
  if (!stripe || !elements) {
    toast.error('Stripe n\'est pas encore chargé');
    return;
  }

  const cardElement = elements.getElement(CardElement);
  if (!cardElement) {
    toast.error('Élément de carte non trouvé');
    return;
  }

  try {
    setIsProcessing(true);

    // 1. Create payment intent
    const paymentData = await paymentService.createStripePayment({
      idempotency_key: crypto.randomUUID(),
      user_id: user?.id,
      buyer_email: user?.email,
      event_id: eventId,
      amount_major: grandTotal,
      currency: currency.toLowerCase(),
      ticket_lines: pricedSelections.map(sel => ({
        ticket_type_id: sel.ticket_type_id,
        quantity: sel.quantity,
        price_major: sel.price,
        currency: currency,
      })),
      description: `Billets pour événement ${eventId}`,
      save_method: formData.saveMethod,
    });

    if (!paymentData.success || !paymentData.clientSecret) {
      throw new Error('Échec de la création du paiement');
    }

    // 2. Confirm payment with Stripe
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      paymentData.clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.cardholderName || user?.email?.split('@')[0] || 'Card Holder',
            email: user?.email,
            address: formData.billingAddress
              ? {
                  line1: formData.billingAddress,
                  city: formData.billingCity,
                  country: formData.billingCountry,
                }
              : undefined,
          },
        },
      }
    );

    if (confirmError) {
      throw new Error(confirmError.message);
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Success! Clear cart and redirect
      clearCartForEvent(eventId, 'CheckoutForm');
      toast.success('Paiement réussi !');
      navigate(`/payment/success?order=${paymentData.orderId}&provider=stripe`);
    } else {
      throw new Error('Statut de paiement inattendu: ' + paymentIntent?.status);
    }
  } catch (error: any) {
    console.error('Stripe payment error:', error);
    toast.error(error.message || 'Échec du paiement');
  } finally {
    setIsProcessing(false);
  }
};

// Update form rendering for card payments:

{paymentMethod === 'card' ? (
  <div className="space-y-4">
    <StripeCardInput
      disabled={isProcessing}
      onReady={() => setStripeReady(true)}
      onError={(error) => console.error('Card error:', error)}
    />

    {/* Optional: Cardholder name */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Nom du titulaire de la carte
      </label>
      <input
        type="text"
        value={formData.cardholderName}
        onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Nom complet"
      />
    </div>
  </div>
) : (
  // Existing mobile money fields
  <MobileMoneyFields />
)}
```

---

## 5. Backend: Create Stripe Payment Function

**File:** `supabase/functions/create-stripe-payment/index.ts`

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateStripePaymentRequest {
  idempotency_key: string;
  user_id?: string;
  buyer_email?: string;
  event_id: string;
  amount_major: number;
  currency: string;
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;
    currency: string;
  }>;
  description: string;
  save_method?: boolean;
  payment_method_id?: string; // For saved cards
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎯 Stripe Payment Function Started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!stripeSecretKey) {
      throw new Error("Stripe configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const payload: CreateStripePaymentRequest = await req.json();
    console.log("Payment request:", {
      amount: payload.amount_major,
      currency: payload.currency,
      event_id: payload.event_id,
    });

    // Validate required fields
    if (!payload.amount_major || !payload.currency || !payload.event_id) {
      throw new Error("Missing required fields");
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null;
    if (payload.user_id) {
      // Check if user already has a Stripe customer ID
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("stripe_customer_id")
        .eq("user_id", payload.user_id)
        .not("stripe_customer_id", "is", null)
        .limit(1)
        .single();

      if (existingPayment?.stripe_customer_id) {
        stripeCustomerId = existingPayment.stripe_customer_id;
      } else {
        // Create new Stripe customer
        const customerResponse = await fetch(
          "https://api.stripe.com/v1/customers",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              email: payload.buyer_email || "",
              metadata: JSON.stringify({
                user_id: payload.user_id,
                platform: "temba",
              }),
            }),
          }
        );

        if (!customerResponse.ok) {
          throw new Error("Failed to create Stripe customer");
        }

        const customerData = await customerResponse.json();
        stripeCustomerId = customerData.id;
      }
    }

    // Create payment intent
    const paymentIntentParams = new URLSearchParams({
      amount: payload.amount_major.toString(),
      currency: payload.currency.toLowerCase(),
      description: payload.description,
      "automatic_payment_methods[enabled]": "true",
    });

    if (stripeCustomerId) {
      paymentIntentParams.append("customer", stripeCustomerId);
    }

    if (payload.payment_method_id) {
      paymentIntentParams.append("payment_method", payload.payment_method_id);
    }

    // Add metadata
    paymentIntentParams.append("metadata[event_id]", payload.event_id);
    paymentIntentParams.append("metadata[platform]", "temba");
    if (payload.user_id) {
      paymentIntentParams.append("metadata[user_id]", payload.user_id);
    }

    const paymentIntentResponse = await fetch(
      "https://api.stripe.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": payload.idempotency_key,
        },
        body: paymentIntentParams,
      }
    );

    if (!paymentIntentResponse.ok) {
      const errorText = await paymentIntentResponse.text();
      throw new Error(`Stripe API error: ${errorText}`);
    }

    const paymentIntent = await paymentIntentResponse.json();

    // Create payment record in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: payload.user_id || null,
        event_id: payload.event_id,
        amount: payload.amount_major,
        currency: payload.currency,
        status: "pending",
        payment_method: "card",
        provider: "stripe",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: stripeCustomerId,
        token: crypto.randomUUID(), // Internal token for tracking
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Database error: ${paymentError.message}`);
    }

    console.log("✅ Stripe payment created:", {
      payment_id: paymentRecord.id,
      payment_intent_id: paymentIntent.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_id: paymentRecord.id,
        order_id: payload.event_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Stripe payment error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Payment creation failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

## 6. Backend: Stripe Webhook Handler

**File:** `supabase/functions/stripe-webhook/index.ts`

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Stripe signature verification
    // This is a simplified version - use Stripe's library in production
    return true; // TODO: Implement proper verification
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Stripe Webhook Received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    // Get raw body
    const body = await req.text();

    // Verify signature (if webhook secret is configured)
    if (webhookSecret) {
      const isValid = await verifyStripeSignature(body, signature, webhookSecret);
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }
    }

    // Parse event
    const event = JSON.parse(body);
    console.log("Webhook event type:", event.type);

    // Log webhook in database
    const { data: webhookLog } = await supabase
      .from("payment_webhooks")
      .insert({
        provider: "stripe",
        event_type: event.type,
        event_id: event.id,
        event_key: event.data.object.id,
        status: event.type,
        raw: event,
      })
      .select()
      .single();

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(supabase, event.data.object, webhookLog?.id);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(supabase, event.data.object, webhookLog?.id);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(supabase, event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    if (webhookLog) {
      await supabase
        .from("payment_webhooks")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", webhookLog.id);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handlePaymentSucceeded(
  supabase: any,
  paymentIntent: any,
  webhookId?: string
) {
  console.log("💰 Payment succeeded:", paymentIntent.id);

  // Find payment record
  const { data: payment } = await supabase
    .from("payments")
    .select("*, orders(*)")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Update payment status
  await supabase
    .from("payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      amount_paid: paymentIntent.amount_received / 100, // Convert from cents
      card_last4: paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4,
      card_brand: paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand,
      webhook_id: webhookId,
    })
    .eq("id", payment.id);

  // Update order status
  if (payment.orders) {
    await supabase
      .from("orders")
      .update({
        status: "COMPLETED",
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq("id", payment.orders.id);

    // Generate tickets (similar to PayDunya flow)
    // TODO: Implement ticket generation
  }

  console.log("✅ Payment processed successfully");
}

async function handlePaymentFailed(
  supabase: any,
  paymentIntent: any,
  webhookId?: string
) {
  console.log("❌ Payment failed:", paymentIntent.id);

  await supabase
    .from("payments")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      metadata: { failure_reason: paymentIntent.last_payment_error?.message },
      webhook_id: webhookId,
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);
}

async function handlePaymentCanceled(supabase: any, paymentIntent: any) {
  console.log("🚫 Payment canceled:", paymentIntent.id);

  await supabase
    .from("payments")
    .update({
      status: "canceled",
      failed_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);
}

async function handleChargeRefunded(supabase: any, charge: any) {
  console.log("↩️ Charge refunded:", charge.id);

  await supabase
    .from("payments")
    .update({
      status: "refunded",
      metadata: { refund_amount: charge.amount_refunded },
    })
    .eq("stripe_charge_id", charge.id);
}
```

---

## 7. Testing Scripts

**File:** `test-stripe-payment.sh`

```bash
#!/bin/bash

# Test Stripe payment creation
echo "Testing Stripe payment creation..."

curl -X POST \
  'http://localhost:54321/functions/v1/create-stripe-payment' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "idempotency_key": "'$(uuidgen)'",
    "buyer_email": "test@example.com",
    "event_id": "test-event-123",
    "amount_major": 5000,
    "currency": "xof",
    "ticket_lines": [
      {
        "ticket_type_id": "ticket-123",
        "quantity": 2,
        "price_major": 2500,
        "currency": "xof"
      }
    ],
    "description": "Test ticket purchase"
  }'

echo "\n\nTest completed!"
```

---

## Quick Reference: Payment Flow Comparison

### PayDunya (Mobile Money)
```
1. User enters phone number
2. Backend creates PayDunya invoice
3. User redirected to PayDunya
4. User completes payment in mobile app
5. PayDunya sends webhook
6. Backend generates tickets
7. User redirected to success page
```

### Stripe (Cards)
```
1. User enters card in Stripe Elements
2. Frontend creates PaymentIntent (gets client_secret)
3. Frontend confirms payment with Stripe
4. Stripe processes payment (may require 3DS)
5. Stripe sends webhook
6. Backend generates tickets
7. User sees success (no redirect needed)
```

---

*For more examples, see the full implementation plan and setup guide.*

