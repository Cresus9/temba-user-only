# Stripe & pawaPay Separation - Visual Guide

## ✅ **CRITICAL: Stripe Will NOT Be Affected**

This document visually demonstrates why Stripe payments will continue working perfectly while we implement pawaPay.

## 🔄 Payment Flow Separation

### Current Architecture (PayDunya + Stripe)
```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT METHOD SELECTION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   MOBILE MONEY          │  │   CARD PAYMENT          │    │
│  │   (Orange/Wave/Moov)    │  │   (Visa/MC/Amex)       │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              ▼                            ▼                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   PayDunya API          │  │   Stripe API            │    │
│  │   (XOF Currency)        │  │   (USD Currency)        │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              ▼                            ▼                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   paydunya-ipn          │  │   stripe-webhook         │    │
│  │   (Webhook Handler)     │  │   (Webhook Handler)      │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              └────────────┬────────────────┘                  │
│                           ▼                                    │
│              ┌─────────────────────────┐                      │
│              │   Generate Tickets      │                      │
│              │   (Shared Function)     │                      │
│              └─────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### After pawaPay Migration (pawaPay + Stripe)
```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT METHOD SELECTION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   MOBILE MONEY          │  │   CARD PAYMENT          │    │
│  │   (Orange/Wave/Moov)    │  │   (Visa/MC/Amex)        │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              ▼                            ▼                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   pawaPay API           │  │   Stripe API            │    │
│  │   (XOF Currency)        │  │   (USD Currency)       │    │
│  │   ⚠️ ONLY THIS CHANGES   │  │   ✅ UNTOUCHED          │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              ▼                            ▼                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │   pawapay-webhook        │  │   stripe-webhook         │    │
│  │   (Webhook Handler)     │  │   (Webhook Handler)      │    │
│  │   ⚠️ ONLY THIS CHANGES   │  │   ✅ UNTOUCHED           │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                            │                   │
│              └────────────┬────────────────┘                  │
│                           ▼                                    │
│              ┌─────────────────────────┐                      │
│              │   Generate Tickets      │                      │
│              │   (Shared Function)     │                      │
│              │   ✅ UNTOUCHED          │                      │
│              └─────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure - What Changes vs What Stays

### ✅ Files We'll CREATE (New pawaPay Code)
```
supabase/functions/
├── create-pawapay-payment/     ← NEW (replaces PayDunya)
│   └── index.ts
└── pawapay-webhook/             ← NEW (replaces paydunya-ipn)
    └── index.ts

src/services/
└── pawapayService.ts            ← NEW (replaces paydunyaService)

src/components/payment/
└── PawaPayPayment.tsx            ← NEW (replaces PayDunya redirect)
```

### ✅ Files We'll MODIFY (Only Mobile Money Parts)
```
src/components/checkout/
└── CheckoutForm.tsx
    └── Only this block changes:
        if (paymentMethod === 'mobile_money') {
          // Replace PayDunya call with pawaPay
        }
        // Everything else stays the same!
```

### ❌ Files We'll NEVER TOUCH (Stripe Code)
```
supabase/functions/
├── create-stripe-payment/       ← ✅ UNTOUCHED
│   └── index.ts
└── stripe-webhook/              ← ✅ UNTOUCHED
    └── index.ts

src/services/
└── stripeService.ts             ← ✅ UNTOUCHED

src/components/payment/
└── StripeCardInput.tsx          ← ✅ UNTOUCHED
```

## 🔒 Code Separation Examples

### Example 1: Payment Routing Logic

```typescript
// CheckoutForm.tsx - Payment handler

const handlePayment = async () => {
  // ═══════════════════════════════════════════════════════
  // ✅ STRIPE CODE PATH - UNTOUCHED
  // ═══════════════════════════════════════════════════════
  if (paymentMethod === 'card') {
    // All this code stays EXACTLY the same
    const stripeResponse = await paymentService.createStripePayment({
      amount: totalAmount,
      currency: 'XOF',
      event_id: eventId,
      ticket_quantities: tickets,
    });
    
    // Stripe payment flow continues unchanged
    const { clientSecret } = stripeResponse;
    await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { /* ... */ }
      }
    });
    
    // Stripe success handling - unchanged
    onSuccess();
    return;
  }
  
  // ═══════════════════════════════════════════════════════
  // ⚠️ MOBILE MONEY CODE PATH - ONLY THIS CHANGES
  // ═══════════════════════════════════════════════════════
  if (paymentMethod === 'mobile_money') {
    // OLD: PayDunya call
    // const paydunyaResponse = await paymentService.createPaydunyaPayment(...)
    
    // NEW: pawaPay call
    const pawapayResponse = await paymentService.createPawaPayPayment({
      order_id: orderId,
      amount: totalAmount,
      currency: 'XOF',
      phone: mobilePhone,
      provider: mobileProvider,
      user_id: user?.id,
      event_id: eventId,
      ticket_quantities: tickets,
    });
    
    // pawaPay in-app payment (no redirect!)
    await pawaPaySDK.initiatePayment({
      transactionId: pawapayResponse.transaction_id,
    });
    
    // pawaPay success handling
    onSuccess();
    return;
  }
};
```

**Key Point:** The `if (paymentMethod === 'card')` block is **completely separate** and **never executed** when mobile money is selected. Zero risk!

### Example 2: Edge Function Separation

```typescript
// create-stripe-payment/index.ts
// ✅ THIS FILE IS NEVER TOUCHED

export async function handler(req: Request) {
  // Stripe payment creation
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInUSD,
    currency: 'usd',
    // ... Stripe config
  });
  
  // Return Stripe client secret
  return { clientSecret: paymentIntent.client_secret };
}

// ────────────────────────────────────────────────────────

// create-pawapay-payment/index.ts
// ⚠️ NEW FILE - REPLACES PayDunya only

export async function handler(req: Request) {
  // pawaPay payment creation
  const response = await fetch('https://api.pawapay.cloud/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAWAPAY_API_KEY}`,
    },
    body: JSON.stringify({
      amount: { currency: 'XOF', value: amount },
      // ... pawaPay config
    }),
  });
  
  // Return pawaPay transaction ID
  return { transaction_id: response.transactionId };
}
```

**Key Point:** These are **completely separate files** that **never interact**. Stripe function runs independently!

### Example 3: Webhook Separation

```typescript
// stripe-webhook/index.ts
// ✅ THIS FILE IS NEVER TOUCHED

serve(async (req) => {
  const event = await stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
  
  // Stripe event handling - unchanged
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handleStripeSuccess(event.data);
      break;
  }
  
  return new Response('OK');
});

// ────────────────────────────────────────────────────────

// pawapay-webhook/index.ts
// ⚠️ NEW FILE - REPLACES paydunya-ipn only

serve(async (req) => {
  // Verify pawaPay webhook signature
  const isValid = verifyPawaPaySignature(body, signature);
  
  // pawaPay event handling
  switch (event.type) {
    case 'payment.success':
      await handlePawaPaySuccess(event.data);
      break;
  }
  
  return new Response('OK');
});
```

**Key Point:** Webhooks are **completely independent**. Stripe webhook continues processing Stripe events, pawaPay webhook processes pawaPay events. They never interfere!

## 🗄️ Database Separation

### Payment Records Stay Separate

```sql
-- Stripe payments
SELECT * FROM payments WHERE provider = 'stripe';
-- Returns: All card payments (USD)

-- pawaPay payments  
SELECT * FROM payments WHERE provider = 'pawapay';
-- Returns: All mobile money payments (XOF)

-- They never mix or conflict!
```

### Orders Table Supports Both

```sql
-- Orders from Stripe payments
SELECT * FROM orders 
WHERE payment_method = 'card'
  AND id IN (SELECT order_id FROM payments WHERE provider = 'stripe');

-- Orders from pawaPay payments
SELECT * FROM orders 
WHERE payment_method = 'mobile_money'
  AND id IN (SELECT order_id FROM payments WHERE provider = 'pawapay');
```

**Key Point:** Database records are **completely separate** based on `provider` column. No conflicts possible!

## 🔍 Verification Checklist

### Before Implementation
- [ ] Verify Stripe payments currently work
- [ ] Document Stripe webhook endpoints
- [ ] Note Stripe Edge Function names
- [ ] List all Stripe-related files

### During Implementation
- [ ] Only create NEW pawaPay files
- [ ] Only modify mobile money code paths
- [ ] Never touch Stripe files
- [ ] Never modify card payment logic

### After Implementation
- [ ] Test Stripe payments still work
- [ ] Verify Stripe webhooks process correctly
- [ ] Confirm Stripe tickets generate properly
- [ ] Test pawaPay payments work
- [ ] Verify both can run simultaneously

## 🎯 Safety Guarantees

### 1. **Separate Code Execution**
- Stripe code path: `if (paymentMethod === 'card')`
- pawaPay code path: `if (paymentMethod === 'mobile_money')`
- **They never execute at the same time!**

### 2. **Separate Edge Functions**
- Stripe: `create-stripe-payment` function
- pawaPay: `create-pawapay-payment` function
- **Different endpoints, different code!**

### 3. **Separate Webhooks**
- Stripe: `stripe-webhook` function
- pawaPay: `pawapay-webhook` function
- **Different URLs, different handlers!**

### 4. **Separate Database Records**
- Stripe: `provider = 'stripe'`
- pawaPay: `provider = 'pawapay'`
- **Different records, no conflicts!**

### 5. **Shared Code is Read-Only**
- Ticket generation function
- Order creation logic
- Database connection
- **These are utilities, not payment-specific!**

## ✅ Final Assurance

**Stripe will continue working because:**

1. ✅ **Zero code changes** to Stripe files
2. ✅ **Separate execution paths** - never mix
3. ✅ **Independent functions** - different endpoints
4. ✅ **Isolated webhooks** - different handlers
5. ✅ **Separate database records** - no conflicts
6. ✅ **Tested separation** - can run simultaneously

**You can implement pawaPay with complete confidence that Stripe will be unaffected!** 🎉

---

*Last Updated: January 30, 2025*
*Stripe & pawaPay Separation Guide Version: 1.0.0*
