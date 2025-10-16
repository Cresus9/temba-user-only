# Hybrid Payment System - Flow Diagrams

**Visual Guide to Payment Flows**  
**Version:** 2.0  
**Last Updated:** October 13, 2025

---

## Table of Contents

1. [Complete System Flow](#complete-system-flow)
2. [Stripe Card Payment Flow](#stripe-card-payment-flow)
3. [PayDunya Mobile Money Flow](#paydunya-mobile-money-flow)
4. [FX Conversion Flow](#fx-conversion-flow)
5. [Webhook Processing Flow](#webhook-processing-flow)
6. [Ticket Generation Flow](#ticket-generation-flow)
7. [Error Recovery Flow](#error-recovery-flow)

---

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Browse Events  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Select Tickets  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ View Checkout   │
                    │ (Total in XOF)  │
                    └─────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Select Payment Method         │
              └───────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  Mobile Money    │        │   Credit Card    │
    └──────────────────┘        └──────────────────┘
                │                           │
                │                           │
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  PayDunya Flow   │        │   Stripe Flow    │
    │  (See below)     │        │   (See below)    │
    └──────────────────┘        └──────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌─────────────────┐
                    │ Payment Success │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Tickets Created │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Email Sent      │
                    │ (Confirmation)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  User Happy! 🎉 │
                    └─────────────────┘
```

---

## Stripe Card Payment Flow

### Detailed Step-by-Step

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRIPE CARD PAYMENT                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Enters Card Details
┌─────────────────────────────────────────────────┐
│ Frontend: StripePaymentForm.tsx                 │
│                                                 │
│  [Card Number Input] (Stripe Elements)         │
│  [Expiry Date]       (PCI Compliant)           │
│  [CVV]               (Never touches our server)│
│                                                 │
│  Display: 5 000 XOF                            │
│  Charge:  $8.86 USD                            │
│  Rate:    1 USD = 574 XOF                      │
│                                                 │
│  [Pay Button]                                  │
└─────────────────────────────────────────────────┘
                    │
                    │ User clicks "Pay"
                    ▼
Step 2: Create Order
┌─────────────────────────────────────────────────┐
│ Frontend: orderService.createOrder()            │
│                                                 │
│ POST /orders                                    │
│ {                                               │
│   event_id: "uuid",                            │
│   ticket_quantities: {"type-1": 2},            │
│   total: 5000,                                 │
│   currency: "XOF",                             │
│   status: "PENDING"                            │
│ }                                               │
│                                                 │
│ Returns: { orderId: "uuid", success: true }    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 3: Get FX Quote (Optional)
┌─────────────────────────────────────────────────┐
│ POST /functions/v1/fx-quote                     │
│                                                 │
│ Request:                                        │
│ {                                               │
│   xof_amount_minor: 5000,                      │
│   margin_bps: 150                              │
│ }                                               │
│                                                 │
│ Response:                                       │
│ {                                               │
│   usd_cents: 886,                              │
│   fx_num: 100,                                 │
│   fx_den: 574,                                 │
│   fx_locked_at: "2025-10-13T10:30:00Z"        │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 4: Create Stripe PaymentIntent
┌─────────────────────────────────────────────────┐
│ POST /functions/v1/create-stripe-payment        │
│                                                 │
│ Request (Advanced Mode):                        │
│ {                                               │
│   display_amount_minor: 5000,                  │
│   display_currency: "XOF",                     │
│   charge_amount_minor: 886,                    │
│   charge_currency: "USD",                      │
│   fx_num: 100,                                 │
│   fx_den: 574,                                 │
│   fx_locked_at: "2025-10-13T10:30:00Z",       │
│   event_id: "uuid",                            │
│   order_id: "uuid",                            │
│   user_id: "uuid"                              │
│ }                                               │
│                                                 │
│ Backend Actions:                                │
│ 1. Check idempotency                           │
│ 2. Create Stripe PaymentIntent (USD)          │
│ 3. Create payment record (both amounts)        │
│ 4. Return client secret                        │
│                                                 │
│ Response:                                       │
│ {                                               │
│   clientSecret: "pi_xxx_secret_xxx",          │
│   paymentId: "uuid",                           │
│   paymentToken: "stripe-token-xxx"            │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 5: Confirm Payment (Stripe.js)
┌─────────────────────────────────────────────────┐
│ Frontend: stripe.confirmCardPayment()           │
│                                                 │
│ stripe.confirmCardPayment(                      │
│   clientSecret,                                 │
│   {                                             │
│     payment_method: {                           │
│       card: cardElement                         │
│     }                                           │
│   }                                             │
│ )                                               │
│                                                 │
│ User completes 3D Secure if required           │
│                                                 │
│ Stripe processes payment                        │
│                                                 │
│ Returns:                                        │
│ {                                               │
│   paymentIntent: {                             │
│     status: "succeeded"                         │
│   }                                             │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    │ (Async - happens in parallel)
                    ▼
Step 6: Stripe Webhook (payment_intent.succeeded)
┌─────────────────────────────────────────────────┐
│ POST /functions/v1/stripe-webhook               │
│                                                 │
│ 1. Verify webhook signature                    │
│ 2. Log webhook (idempotent by event.id)       │
│ 3. Find payment by PaymentIntent ID           │
│ 4. Check if already completed (idempotency)   │
│ 5. Update payment status → 'completed'         │
│ 6. Update order status → 'COMPLETED'           │
│ 7. Check if tickets exist                      │
│ 8. Create tickets if missing                   │
│ 9. Mark webhook as processed                   │
│                                                 │
│ Returns: { received: true }                    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 7: Frontend Success
┌─────────────────────────────────────────────────┐
│ Frontend: Navigate to /payment/success         │
│                                                 │
│ Query params:                                   │
│ ?order={orderId}&token={paymentToken}          │
│                                                 │
│ 1. Call verify-payment                         │
│ 2. Display success message                     │
│ 3. Show tickets                                │
│ 4. Show download button                        │
└─────────────────────────────────────────────────┘
                    │
                    ▼
                 SUCCESS! 🎉
```

### Timeline

```
Time    Frontend                Backend                 Stripe
-----   --------                -------                 ------
0ms     User clicks "Pay"
100ms   Create order →
200ms                           Order saved
300ms   Get FX quote →
400ms                           Return quote
500ms   Create PaymentIntent →
600ms                           Call Stripe API →
700ms                                                   PaymentIntent created
800ms                           Store in DB
900ms                           Return clientSecret
1000ms  ← Receive secret
1100ms  Confirm payment →
2000ms                                                  Process card (3DS)
3000ms                                                  Payment succeeds
3100ms                                                  Send webhook →
3200ms                          ← Receive webhook
3300ms                          Update payment
3400ms                          Create tickets
3500ms  Payment succeeds
3600ms  Navigate to success
3700ms  Verify payment →
3800ms                          Return success
3900ms  Display tickets
```

---

## PayDunya Mobile Money Flow

### Detailed Step-by-Step

```
┌─────────────────────────────────────────────────────────────────┐
│                PAYDUNYA MOBILE MONEY PAYMENT                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Selects Mobile Money
┌─────────────────────────────────────────────────┐
│ Frontend: CheckoutForm.tsx                      │
│                                                 │
│  Payment Method: [Mobile Money]                │
│                                                 │
│  Provider: [Orange Money ▾]                    │
│  Phone:    +226 XX XX XX XX                    │
│                                                 │
│  Amount: 5 000 XOF                             │
│                                                 │
│  [Pay Button]                                  │
└─────────────────────────────────────────────────┘
                    │
                    │ User clicks "Pay"
                    ▼
Step 2: Create Order
┌─────────────────────────────────────────────────┐
│ Frontend: orderService.createOrder()            │
│                                                 │
│ POST /orders                                    │
│ {                                               │
│   event_id: "uuid",                            │
│   ticket_quantities: {"type-1": 2},            │
│   total: 5000,                                 │
│   currency: "XOF",                             │
│   status: "PENDING"                            │
│ }                                               │
│                                                 │
│ Returns: { orderId: "uuid" }                   │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 3: Create PayDunya Payment
┌─────────────────────────────────────────────────┐
│ POST /functions/v1/create-payment               │
│                                                 │
│ Request:                                        │
│ {                                               │
│   idempotency_key: "payment-xxx",              │
│   user_id: "uuid",                             │
│   event_id: "uuid",                            │
│   order_id: "uuid",                            │
│   amount_major: 5000,                          │
│   currency: "XOF",                             │
│   method: "mobile_money",                      │
│   phone: "+226XXXXXXXX",                       │
│   provider: "orange-money-bf",                 │
│   return_url: "https://temba.com/success",    │
│   cancel_url: "https://temba.com/cancelled"   │
│ }                                               │
│                                                 │
│ Backend Actions:                                │
│ 1. Create payment record (XOF)                 │
│ 2. Call PayDunya API                           │
│ 3. Get payment URL                             │
│                                                 │
│ Response:                                       │
│ {                                               │
│   success: true,                               │
│   payment_url: "https://app.paydunya.com/...",│
│   payment_token: "pdnya-token-xxx"            │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 4: Redirect to PayDunya
┌─────────────────────────────────────────────────┐
│ window.location.href = payment_url              │
│                                                 │
│ User redirected to:                            │
│ https://app.paydunya.com/invoice/xxx           │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 5: User Completes Payment on PayDunya
┌─────────────────────────────────────────────────┐
│ PayDunya Payment Page                           │
│                                                 │
│ 1. User enters PIN                             │
│ 2. Provider (Orange/Wave/Moov) confirms        │
│ 3. Payment processed                           │
│                                                 │
│ PayDunya redirects back:                       │
│ https://temba.com/success?token=xxx            │
└─────────────────────────────────────────────────┘
                    │
                    │ (Async - happens in background)
                    ▼
Step 6: PayDunya IPN Webhook
┌─────────────────────────────────────────────────┐
│ POST /functions/v1/paydunya-ipn                 │
│                                                 │
│ PayDunya sends notification:                    │
│ {                                               │
│   invoice: {                                    │
│     token: "pdnya-token-xxx",                  │
│     status: "completed",                        │
│     total_amount: 5000                          │
│   }                                             │
│ }                                               │
│                                                 │
│ Backend Actions:                                │
│ 1. Validate IP/signature                       │
│ 2. Log webhook (idempotent)                    │
│ 3. Find payment by transaction_id              │
│ 4. Update payment → 'completed'                │
│ 5. Update order → 'COMPLETED'                  │
│ 6. Call admin_finalize_payment()               │
│ 7. Generate tickets                            │
│                                                 │
│ Returns: { received: true }                    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
Step 7: User Returns to Success Page
┌─────────────────────────────────────────────────┐
│ https://temba.com/success?token=xxx            │
│                                                 │
│ 1. Call verify-payment with token              │
│ 2. Confirm payment completed                   │
│ 3. Display success message                     │
│ 4. Show tickets                                │
│ 5. Show download button                        │
└─────────────────────────────────────────────────┘
                    │
                    ▼
                 SUCCESS! 🎉
```

### Timeline

```
Time     User Action              Backend                     PayDunya
-----    -----------              -------                     --------
0ms      Clicks "Pay"
100ms    Create order →
200ms                             Order saved
300ms    Create payment →
400ms                             Call PayDunya →
500ms                                                         Invoice created
600ms                             ← Payment URL
700ms    ← Redirect URL
800ms    Redirected to PayDunya →
10s      Enters PIN
15s                                                           Processes payment
20s                                                           Payment succeeds
21s                                                           Sends IPN →
22s                              ← IPN received
23s                              Process IPN
24s                              Update payment
25s                              Create tickets
26s                                                           Redirects user →
27s      ← Back to Temba
28s      Verify payment →
29s                              ← Success
30s      Display tickets
```

---

## FX Conversion Flow

### How Currency Conversion Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    FX CONVERSION SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

Step 1: Hourly Rate Fetch (Background Job)
┌────────────────────────────────────────────────┐
│ Supabase Cron Job (every hour)                │
│                                                │
│ Triggers: fetch-fx-rates function              │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Try FX Sources (in order):                    │
│                                                │
│ 1. XE.com API (if configured)                 │
│    └─ 403 → Try next                          │
│                                                │
│ 2. ExchangeRate-API.com (free)                │
│    └─ Success! Get USD→XOF rate               │
│                                                │
│ 3. Fixer.io (if configured)                   │
│    └─ Fallback if needed                      │
│                                                │
│ 4. Hardcoded (566 XOF/USD)                    │
│    └─ Last resort                             │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Validate Rate                                  │
│                                                │
│ Rate: 566.00 XOF/USD                          │
│                                                │
│ Checks:                                        │
│ ✓ Is numeric                                  │
│ ✓ Is positive                                 │
│ ✓ In range 300-1000                           │
│ ✓ Not suspiciously different from last rate  │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Update fx_rates Table                          │
│                                                │
│ 1. Deactivate old rates:                      │
│    UPDATE fx_rates                             │
│    SET is_active = false                       │
│    WHERE is_active = true                      │
│                                                │
│ 2. Insert new rate:                            │
│    INSERT INTO fx_rates {                      │
│      from_currency: 'USD',                     │
│      to_currency: 'XOF',                       │
│      rate_decimal: 566.0000,                   │
│      source: 'ExchangeRate-API',              │
│      valid_from: NOW(),                        │
│      valid_until: NOW() + 1 hour,             │
│      is_active: true                           │
│    }                                           │
└────────────────────────────────────────────────┘
                    │
                    ▼
                Rate Cached ✓

Step 2: Frontend Requests Quote
┌────────────────────────────────────────────────┐
│ User at Checkout:                              │
│ Cart Total: 5000 XOF                          │
│                                                │
│ Frontend calls:                                │
│ stripePaymentService.getFXQuote(5000)          │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ POST /functions/v1/fx-quote                    │
│                                                │
│ Request:                                       │
│ {                                              │
│   xof_amount_minor: 5000,                     │
│   margin_bps: 150  // 1.5%                    │
│ }                                              │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Backend: Get Active Rate                      │
│                                                │
│ SELECT * FROM fx_rates                         │
│ WHERE from_currency = 'USD'                    │
│   AND to_currency = 'XOF'                      │
│   AND is_active = true                         │
│ ORDER BY valid_from DESC                       │
│ LIMIT 1                                        │
│                                                │
│ Result:                                        │
│ {                                              │
│   rate_decimal: 566.0000,                      │
│   source: 'ExchangeRate-API'                  │
│ }                                              │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Apply Margin                                   │
│                                                │
│ Base Rate:     566 XOF/USD                    │
│ Margin:        1.5% (150 bps)                 │
│ Multiplier:    1.015                          │
│ Effective:     574 XOF/USD                    │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Calculate USD Amount                           │
│                                                │
│ XOF:           5000                           │
│ Rate:          574 XOF/USD                    │
│                                                │
│ Formula:       USD = XOF / Rate               │
│ USD:           5000 / 574 = 8.71 USD          │
│ USD Cents:     871                            │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Return Locked Quote                            │
│                                                │
│ Response:                                      │
│ {                                              │
│   usd_cents: 871,                             │
│   fx_num: 100,                                │
│   fx_den: 574,                                │
│   fx_locked_at: "2025-10-13T10:30:00Z",      │
│   margin_bps: 150,                            │
│   base_xof_per_usd: 566,                      │
│   effective_xof_per_usd: 574,                 │
│   display_amount: "5 000 FCFA",              │
│   charge_amount: "$8.71 USD"                  │
│ }                                              │
│                                                │
│ Quote valid for: 5 minutes                    │
└────────────────────────────────────────────────┘
                    │
                    ▼
         Quote Returned to Frontend

Step 3: Create Payment with Quote
┌────────────────────────────────────────────────┐
│ Frontend → create-stripe-payment               │
│                                                │
│ Passes locked quote:                           │
│ {                                              │
│   display_amount_minor: 5000,                 │
│   charge_amount_minor: 871,                   │
│   fx_num: 100,                                │
│   fx_den: 574,                                │
│   fx_locked_at: "2025-10-13T10:30:00Z"       │
│ }                                              │
│                                                │
│ Backend stores exact FX used in payment record│
└────────────────────────────────────────────────┘
                    │
                    ▼
         Payment Created with FX Details

Step 4: Display to User
┌────────────────────────────────────────────────┐
│ Checkout Summary                               │
│                                                │
│ Amount (XOF):    5 000 FCFA                   │
│ Amount (USD):    $8.71 USD                    │
│ Exchange Rate:   1 USD = 574 XOF             │
│                                                │
│ [Pay $8.71 USD]                               │
└────────────────────────────────────────────────┘
```

### Example Calculation

```
Cart Items:
- VIP Ticket × 2      = 4000 XOF
- Service Fee         = 1000 XOF
                       ─────────
Total (Display):      = 5000 XOF

FX Conversion:
Base Rate:            = 566 XOF/USD
Margin (1.5%):        = 566 × 1.015 = 574 XOF/USD
USD Calculation:      = 5000 / 574 = 8.71 USD
USD Cents:            = 871 cents

Stripe Charge:
Amount:               = 871 cents
Currency:             = USD
User Sees:            = "$8.71 USD"

Database Record:
{
  display_amount_minor: 5000,
  display_currency: 'XOF',
  charge_amount_minor: 871,
  charge_currency: 'USD',
  fx_rate_numerator: 100,
  fx_rate_denominator: 574,
  fx_locked_at: '2025-10-13T10:30:00Z',
  fx_margin_bps: 150
}

Verification:
5000 XOF × (100/574) = 8.71 USD ✓
871 USD cents × (574/100) = 5000.54 XOF ≈ 5000 XOF ✓
```

---

## Webhook Processing Flow

### Idempotent Webhook Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK PROCESSING                           │
└─────────────────────────────────────────────────────────────────┘

Incoming Webhook (Stripe or PayDunya)
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 1: Verify Signature                      │
│                                                │
│ Stripe:                                        │
│   const sig = headers['stripe-signature']     │
│   stripe.webhooks.constructEvent(body, sig)   │
│   ✓ Valid signature                           │
│                                                │
│ PayDunya:                                      │
│   const ip = headers['x-forwarded-for']       │
│   ✓ IP in whitelist                           │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 2: Log Webhook (Idempotent)              │
│                                                │
│ INSERT INTO payment_webhooks                   │
│ {                                              │
│   provider: 'stripe',                          │
│   event_type: 'payment_intent.succeeded',     │
│   event_key: 'evt_xxx',  // Unique!           │
│   raw_payload: {...},                          │
│   processed: false                             │
│ }                                              │
│ ON CONFLICT (event_key) DO NOTHING            │
│                                                │
│ → If duplicate, upsert returns existing record│
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 3: Find Payment                           │
│                                                │
│ Stripe:                                        │
│   SELECT * FROM payments                       │
│   WHERE stripe_payment_intent_id = 'pi_xxx'   │
│                                                │
│ PayDunya:                                      │
│   SELECT * FROM payments                       │
│   WHERE transaction_id = 'pdnya-token-xxx'    │
│                                                │
│ Result: payment record found                   │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 4: Check Idempotency                     │
│                                                │
│ IF payment.status IN                           │
│    ('completed', 'succeeded', 'failed'):       │
│                                                │
│   Log: "Already processed"                     │
│   Mark webhook as processed                    │
│   Return: { received: true }                   │
│   EXIT                                         │
│                                                │
│ ELSE:                                          │
│   Continue processing...                       │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 5: Update Payment                         │
│                                                │
│ UPDATE payments                                │
│ SET                                            │
│   status = 'completed',                        │
│   completed_at = NOW(),                        │
│   amount_paid = charge_amount / 100            │
│ WHERE id = payment_id                          │
│                                                │
│ Result: 1 row updated                          │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 6: Update Order                           │
│                                                │
│ UPDATE orders                                  │
│ SET                                            │
│   status = 'COMPLETED',                        │
│   updated_at = NOW()                           │
│ WHERE id = payment.order_id                    │
│                                                │
│ Result: 1 row updated                          │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 7: Generate Tickets                      │
│                                                │
│ Stripe Webhook:                                │
│   → Creates tickets directly in webhook       │
│   → Checks for existing tickets first         │
│                                                │
│ PayDunya IPN:                                  │
│   → Calls admin_finalize_payment(payment_id)  │
│   → Function handles ticket creation          │
│                                                │
│ Both methods check for duplicates              │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ Step 8: Mark Webhook Processed                │
│                                                │
│ UPDATE payment_webhooks                        │
│ SET                                            │
│   processed = true,                            │
│   processed_at = NOW()                         │
│ WHERE event_key = 'evt_xxx'                    │
│                                                │
│ Result: Webhook marked as complete             │
└────────────────────────────────────────────────┘
                    │
                    ▼
            Return Success
         { received: true }
```

### Retry Handling

```
Scenario: Webhook Fails (e.g., database timeout)

Attempt 1 (0 seconds):
┌────────────────────────────────────┐
│ Webhook arrives                    │
│ Processing fails (timeout)         │
│ Return 500 error                   │
└────────────────────────────────────┘
                │
                │ Stripe/PayDunya receives 500
                │ Schedules retry
                ▼

Attempt 2 (1 minute later):
┌────────────────────────────────────┐
│ Webhook arrives (same event_key)   │
│ Checks payment_webhooks table      │
│ → Found existing log (not processed)│
│ Continue processing                 │
│ Success!                            │
│ Return 200                          │
└────────────────────────────────────┘
                │
                ▼
         Webhook processed ✓

Key Points:
- event_key prevents duplicate logging
- Payment status check prevents duplicate updates
- Ticket existence check prevents duplicates
- Safe to retry infinite times
```

---

## Ticket Generation Flow

### admin_finalize_payment() Function

```
┌─────────────────────────────────────────────────────────────────┐
│              TICKET GENERATION (Idempotent)                     │
└─────────────────────────────────────────────────────────────────┘

Call: SELECT admin_finalize_payment('payment-uuid')

Step 1: Lock Rows
┌────────────────────────────────────────────────┐
│ SELECT * FROM payments                         │
│ WHERE id = 'payment-uuid'                      │
│ FOR UPDATE                                     │
│                                                │
│ → Acquires row lock                           │
│ → Other calls wait here                       │
└────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│ SELECT * FROM orders                           │
│ WHERE id = payment.order_id                    │
│ FOR UPDATE                                     │
│                                                │
│ → Acquires row lock                           │
└────────────────────────────────────────────────┘
                │
                ▼
Step 2: Update Payment Status
┌────────────────────────────────────────────────┐
│ IF payment.status NOT IN                       │
│    ('completed', 'succeeded'):                 │
│                                                │
│   UPDATE payments                              │
│   SET status = 'completed',                    │
│       completed_at = COALESCE(completed_at, NOW())│
│       amount_paid = COALESCE(amount_paid, amount) │
│   WHERE id = payment_id                        │
│                                                │
│ ELSE:                                          │
│   Skip (already completed)                     │
└────────────────────────────────────────────────┘
                │
                ▼
Step 3: Update Order Status
┌────────────────────────────────────────────────┐
│ UPDATE orders                                  │
│ SET status = 'COMPLETED'                       │
│ WHERE id = order_id                            │
└────────────────────────────────────────────────┘
                │
                ▼
Step 4: Calculate Missing Tickets
┌────────────────────────────────────────────────┐
│ Order ticket_quantities:                       │
│ {                                              │
│   "type-1-uuid": 2,                           │
│   "type-2-uuid": 1                            │
│ }                                              │
│                                                │
│ Query existing tickets:                        │
│ SELECT ticket_type_id, COUNT(*)               │
│ FROM tickets                                   │
│ WHERE order_id = 'order-uuid'                  │
│ GROUP BY ticket_type_id                        │
│                                                │
│ Result:                                        │
│ {                                              │
│   "type-1-uuid": 1  // Only 1 exists          │
│   "type-2-uuid": 0  // None exist             │
│ }                                              │
│                                                │
│ Calculate delta:                               │
│ {                                              │
│   "type-1-uuid": 2 - 1 = 1 to create         │
│   "type-2-uuid": 1 - 0 = 1 to create         │
│ }                                              │
└────────────────────────────────────────────────┘
                │
                ▼
Step 5: Create Missing Tickets (Batch)
┌────────────────────────────────────────────────┐
│ FOR EACH ticket type with missing tickets:    │
│                                                │
│ Type 1: Create 1 ticket                       │
│ INSERT INTO tickets (                          │
│   order_id, event_id, user_id,                │
│   ticket_type_id, status, payment_id          │
│ )                                              │
│ SELECT                                         │
│   'order-uuid', 'event-uuid', 'user-uuid',    │
│   'type-1-uuid', 'VALID', 'payment-uuid'      │
│ FROM generate_series(1, 1)                     │
│ → Inserts 1 row                               │
│                                                │
│ Type 2: Create 1 ticket                       │
│ INSERT INTO tickets (...)                      │
│ SELECT ... FROM generate_series(1, 1)          │
│ → Inserts 1 row                               │
│                                                │
│ Total created: 2 tickets                       │
└────────────────────────────────────────────────┘
                │
                ▼
Step 6: Return Summary
┌────────────────────────────────────────────────┐
│ RETURN jsonb_build_object(                     │
│   'success', true,                             │
│   'payment_id', 'payment-uuid',               │
│   'order_id', 'order-uuid',                   │
│   'tickets_created', 2,                        │
│   'per_type', [                               │
│     {                                          │
│       'ticket_type_id': 'type-1-uuid',        │
│       'created': 1                             │
│     },                                         │
│     {                                          │
│       'ticket_type_id': 'type-2-uuid',        │
│       'created': 1                             │
│     }                                          │
│   ]                                            │
│ )                                              │
└────────────────────────────────────────────────┘
                │
                ▼
         Function Complete ✓
```

### Concurrency Safety

```
Scenario: Two webhooks arrive simultaneously

Thread 1                          Thread 2
--------                          --------
Call admin_finalize_payment()     Call admin_finalize_payment()
↓                                 ↓
Lock payment row (acquired)       Lock payment row (waiting...)
↓                                 │
Lock order row                    │
↓                                 │
Update payment                    │
↓                                 │
Create 3 tickets                  │
↓                                 │
Return success                    │
↓                                 │
Release locks                     │
                                  ↓
                                  Lock payment row (acquired)
                                  ↓
                                  Check existing tickets
                                  → Found 3 tickets
                                  ↓
                                  Calculate delta: 3 - 3 = 0
                                  ↓
                                  Create 0 tickets
                                  ↓
                                  Return success (0 created)
                                  ↓
                                  Release locks

Result: Exactly 3 tickets created (no duplicates) ✓
```

---

## Error Recovery Flow

### Stuck Payment Recovery

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR RECOVERY                               │
└─────────────────────────────────────────────────────────────────┘

Scenario: Payment succeeded but webhook failed/delayed

Step 1: Identify Stuck Payment
┌────────────────────────────────────────────────┐
│ SELECT * FROM payments                         │
│ WHERE status = 'pending'                       │
│   AND created_at < NOW() - INTERVAL '1 hour'  │
│                                                │
│ Found: payment-uuid (created 2 hours ago)      │
└────────────────────────────────────────────────┘
                │
                ▼
Step 2: Verify with Provider
┌────────────────────────────────────────────────┐
│ Stripe:                                        │
│   const intent = await stripe.paymentIntents   │
│     .retrieve(payment.stripe_payment_intent_id)│
│   Status: 'succeeded' ✓                        │
│                                                │
│ PayDunya:                                      │
│   Check PayDunya dashboard                     │
│   Status: 'completed' ✓                        │
└────────────────────────────────────────────────┘
                │
                │ Payment actually succeeded!
                ▼
Step 3: Manual Recovery
┌────────────────────────────────────────────────┐
│ Option A: Trigger webhook manually             │
│ (if provider supports replay)                  │
│                                                │
│ Stripe:                                        │
│   stripe trigger payment_intent.succeeded     │
│                                                │
│ PayDunya:                                      │
│   Request IPN resend from dashboard           │
└────────────────────────────────────────────────┘
                │
                ▼
            OR
                │
                ▼
┌────────────────────────────────────────────────┐
│ Option B: Manual completion via SQL            │
│                                                │
│ -- Update payment                              │
│ UPDATE payments                                │
│ SET status = 'completed',                      │
│     completed_at = NOW()                       │
│ WHERE id = 'payment-uuid';                     │
│                                                │
│ -- Generate tickets                            │
│ SELECT admin_finalize_payment('payment-uuid'); │
│                                                │
│ Result:                                        │
│ {                                              │
│   success: true,                               │
│   tickets_created: 3                           │
│ }                                              │
└────────────────────────────────────────────────┘
                │
                ▼
         Payment Recovered ✓
```

### Duplicate Ticket Prevention

```
Scenario: Admin accidentally calls finalization twice

Call 1:
┌────────────────────────────────────────┐
│ SELECT admin_finalize_payment(uuid)    │
│                                        │
│ Existing tickets: 0                    │
│ Needed: 3                              │
│ Created: 3                             │
│                                        │
│ Return: { tickets_created: 3 }        │
└────────────────────────────────────────┘

Call 2 (immediate retry):
┌────────────────────────────────────────┐
│ SELECT admin_finalize_payment(uuid)    │
│                                        │
│ Existing tickets: 3                    │
│ Needed: 3                              │
│ Delta: 3 - 3 = 0                       │
│ Created: 0                             │
│                                        │
│ Return: { tickets_created: 0 }        │
└────────────────────────────────────────┘

Result: Still exactly 3 tickets ✓
```

---

## Summary

### Key Architectural Patterns

1. **Provider Routing**: Automatic based on payment method
2. **Dual-Currency**: XOF display, USD charge (Stripe only)
3. **FX Management**: Cached rates with margin
4. **Idempotency**: Safe retries and duplicate prevention
5. **Webhook Processing**: Signature verification + idempotent handling
6. **Ticket Generation**: Concurrency-safe with delta calculation
7. **Error Recovery**: Manual tools for stuck payments

### Flow Comparison

| Aspect | Stripe (Cards) | PayDunya (Mobile Money) |
|--------|---------------|------------------------|
| Redirect | No (in-page) | Yes (external site) |
| Currency | USD | XOF |
| FX | Yes (live rates) | No |
| Completion Time | 2-5 seconds | 10-30 seconds |
| Webhook | `payment_intent.succeeded` | IPN callback |
| Ticket Creation | In webhook directly | Via `admin_finalize_payment()` |

---

*For more details, see:*
- `HYBRID-PAYMENT-ARCHITECTURE.md` - Full technical documentation
- `HYBRID-PAYMENT-QUICK-REFERENCE.md` - Developer reference guide
- `HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md` - Implementation guide

*Last Updated: October 13, 2025*

