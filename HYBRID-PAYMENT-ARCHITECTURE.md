# Hybrid Payment System Architecture Documentation

**Version:** 2.0  
**Last Updated:** October 13, 2025  
**Status:** Production Active

---

## Executive Summary

The Temba ticketing platform implements a **hybrid payment system** that intelligently routes payments between two providers:

- **PayDunya**: For mobile money payments (Orange Money, Wave, Moov Money)
- **Stripe**: For credit/debit card payments (Visa, Mastercard, Amex)

This architecture provides optimal user experience, competitive transaction fees, and robust payment processing for both African mobile money and international credit cards.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Payment Flow Diagrams](#payment-flow-diagrams)
4. [Database Schema](#database-schema)
5. [Backend Services](#backend-services)
6. [Frontend Components](#frontend-components)
7. [Currency Conversion System](#currency-conversion-system)
8. [Webhook Processing](#webhook-processing)
9. [Payment Finalization](#payment-finalization)
10. [Security & Compliance](#security--compliance)
11. [Error Handling](#error-handling)
12. [Testing Strategy](#testing-strategy)

---

## System Overview

### Key Design Principles

1. **Provider Routing**: Automatic routing based on payment method selection
2. **Currency Transparency**: Display prices in XOF while charging cards in USD
3. **Idempotency**: Prevent duplicate payments through idempotency keys
4. **Webhook Reliability**: Idempotent webhook processing with retry support
5. **Ticket Automation**: Automatic ticket generation on payment success

### Payment Method Routing

```
User Selects Payment Method
        ↓
    ┌───┴────┐
    │        │
Mobile      Card
Money     Payment
    │        │
    ↓        ↓
PayDunya  Stripe
  API       API
(XOF)     (USD)
```

---

## Architecture Components

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ CheckoutForm │  │StripeElements│  │ PayDunya UI  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                    │
│  ┌─────────────────┐  ┌────────────────────────────┐   │
│  │ create-payment  │  │ create-stripe-payment      │   │
│  │   (PayDunya)    │  │    (Stripe PaymentIntent)  │   │
│  └─────────────────┘  └────────────────────────────┘   │
│  ┌─────────────────┐  ┌────────────────────────────┐   │
│  │ paydunya-ipn    │  │ stripe-webhook             │   │
│  └─────────────────┘  └────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ verify-payment (Unified verification)           │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────┐  ┌────────────────────────────┐   │
│  │ fx-quote        │  │ fetch-fx-rates             │   │
│  └─────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                     │
│  ┌───────┐  ┌────────┐  ┌────────┐  ┌───────────────┐│
│  │orders │  │payments│  │tickets │  │payment_webhooks││
│  └───────┘  └────────┘  └────────┘  └───────────────┘│
│  ┌─────────┐  ┌───────────────┐  ┌──────────────────┐│
│  │fx_rates │  │idempotency_   │  │payment_methods   ││
│  └─────────┘  │keys           │  └──────────────────┘│
│               └───────────────┘                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              External Payment Providers                 │
│  ┌──────────────────┐     ┌─────────────────────────┐ │
│  │  PayDunya API    │     │     Stripe API          │ │
│  │  (Mobile Money)  │     │  (Credit/Debit Cards)   │ │
│  └──────────────────┘     └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Payment Flow Diagrams

### Mobile Money Payment Flow (PayDunya)

```
1. User Action
   └─→ Select "Mobile Money"
   └─→ Choose provider (Orange/Wave/Moov)
   └─→ Enter phone number
   └─→ Click "Pay"

2. Order Creation
   └─→ orderService.createOrder()
   └─→ Creates order record in DB
   └─→ Status: PENDING

3. Payment Creation (PayDunya)
   └─→ Calls create-payment function
   └─→ Creates payment record (provider: NULL, amount in XOF)
   └─→ Calls PayDunya API
   └─→ Returns payment URL

4. User Redirect
   └─→ Redirects to PayDunya payment page
   └─→ User completes payment on provider app
   └─→ PayDunya redirects back to return_url

5. Webhook Processing
   └─→ PayDunya sends IPN to paydunya-ipn function
   └─→ Validates webhook signature
   └─→ Logs webhook in payment_webhooks table
   └─→ Updates payment status to 'completed'
   └─→ Updates order status to 'COMPLETED'
   └─→ Calls admin_finalize_payment() function

6. Ticket Generation
   └─→ admin_finalize_payment() generates tickets
   └─→ Inserts ticket records
   └─→ User receives tickets

7. Success Page
   └─→ verify-payment confirms status
   └─→ Displays tickets to user
```

### Card Payment Flow (Stripe)

```
1. User Action
   └─→ Select "Card Payment"
   └─→ Enter card details (Stripe Elements)
   └─→ Click "Pay"

2. Order Creation
   └─→ orderService.createOrder() with method: 'CARD'
   └─→ Creates order record in DB
   └─→ Returns orderId (skips PayDunya)

3. FX Quote (Optional)
   └─→ Frontend calls fx-quote function
   └─→ Gets current USD/XOF exchange rate
   └─→ Calculates USD amount with margin
   └─→ Returns quote with locked rate

4. Payment Intent Creation
   └─→ Calls create-stripe-payment function
   └─→ Parameters:
        - display_amount_minor: 5000 (XOF)
        - charge_amount_minor: 886 (USD cents)
        - fx_num: 100, fx_den: 564 (exchange rate)
        - order_id: linked to order
   └─→ Creates Stripe PaymentIntent (USD)
   └─→ Creates payment record with both amounts
   └─→ Returns clientSecret

5. Payment Confirmation
   └─→ stripe.confirmCardPayment()
   └─→ User completes 3D Secure if required
   └─→ Stripe processes payment
   └─→ Returns PaymentIntent status

6. Webhook Processing
   └─→ Stripe sends payment_intent.succeeded webhook
   └─→ stripe-webhook function receives event
   └─→ Validates webhook signature
   └─→ Logs webhook in payment_webhooks table
   └─→ Updates payment status to 'completed'
   └─→ Updates order status to 'COMPLETED'
   └─→ Creates tickets directly

7. Success Page
   └─→ Shows immediate success
   └─→ verify-payment confirms status
   └─→ Displays tickets to user
```

---

## Database Schema

### Core Tables

#### `payments` Table

```sql
CREATE TABLE payments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID NOT NULL,
  order_id UUID,
  
  -- Legacy amount (for backward compatibility)
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  
  -- Dual-currency tracking (NEW - for Stripe)
  display_currency TEXT DEFAULT 'XOF',          -- What user sees
  display_amount_minor INTEGER,                 -- XOF amount (5000)
  charge_currency TEXT,                         -- What processor charges
  charge_amount_minor INTEGER,                  -- USD cents (886)
  
  -- FX tracking
  fx_rate_numerator INTEGER,                    -- 100
  fx_rate_denominator INTEGER,                  -- 564 (1 USD = 5.64 XOF)
  fx_locked_at TIMESTAMPTZ,
  fx_margin_bps INTEGER DEFAULT 150,            -- 1.5%
  
  -- Payment provider
  provider TEXT,                                -- 'stripe' or 'paydunya' or NULL
  payment_method VARCHAR(50) NOT NULL,          -- 'mobile_money' or 'credit_card'
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',         -- pending, completed, failed
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  amount_paid DECIMAL(10,2),
  
  -- Provider-specific fields
  transaction_id VARCHAR(255),                  -- PayDunya token
  stripe_payment_intent_id TEXT,                -- Stripe PaymentIntent ID
  stripe_payment_method_id TEXT,                -- Stripe PaymentMethod ID
  
  -- Verification
  token UUID DEFAULT gen_random_uuid(),         -- Internal token
  idempotency_key TEXT,
  
  -- Audit
  customer_email TEXT,
  customer_phone TEXT,
  client_ip TEXT,
  user_agent TEXT,
  ipn_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

#### `orders` Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID NOT NULL,
  
  -- Pricing
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  
  -- Dual-currency tracking
  display_currency TEXT DEFAULT 'XOF',
  display_amount_minor INTEGER,
  charge_currency TEXT,
  charge_amount_minor INTEGER,
  
  -- Order details
  ticket_quantities JSONB NOT NULL,             -- { "ticket_type_id": quantity }
  status VARCHAR(20) DEFAULT 'PENDING',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `payment_webhooks` Table

```sql
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider info
  provider TEXT NOT NULL,                       -- 'stripe' or 'paydunya'
  event_type TEXT NOT NULL,                     -- 'payment_intent.succeeded', etc.
  event_key TEXT UNIQUE,                        -- Provider event ID (for idempotency)
  
  -- Webhook data
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Audit
  client_ip TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhooks_event_key ON payment_webhooks(event_key);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_webhooks_provider ON payment_webhooks(provider);
```

#### `fx_rates` Table

```sql
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Currency pair
  from_currency TEXT NOT NULL,                  -- 'USD'
  to_currency TEXT NOT NULL,                    -- 'XOF'
  
  -- Rate (1 USD = rate_decimal XOF)
  rate_decimal DECIMAL(10,4) NOT NULL,          -- 566.0000
  
  -- Source tracking
  source TEXT NOT NULL,                         -- 'XE', 'ExchangeRate-API', 'fallback'
  
  -- Validity period
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one active rate per currency pair
CREATE UNIQUE INDEX idx_fx_rates_unique_active 
  ON fx_rates(from_currency, to_currency) 
  WHERE is_active = true;
```

#### `idempotency_keys` Table

```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
```

#### `tickets` Table

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  event_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ticket_type_id UUID NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'VALID',           -- VALID, USED, CANCELLED
  payment_status VARCHAR(20) DEFAULT 'paid',    -- paid, refunded
  payment_id UUID REFERENCES payments(id),
  
  -- Validation
  qr_code TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_order_type ON tickets(order_id, ticket_type_id);
```

---

## Backend Services

### Supabase Edge Functions

#### 1. `create-payment` (PayDunya)

**Purpose**: Create PayDunya payment for mobile money

**Location**: `supabase/functions/create-payment/index.ts`

**Flow**:
```typescript
1. Validate request (idempotency_key, amount, event_id)
2. Get customer email from user profile or request
3. Create payment record (provider: NULL for legacy, XOF amount)
4. Call PayDunya API to create invoice
5. Return payment URL and token
```

**Key Fields**:
- `amount_major`: XOF amount (e.g., 5000)
- `method`: 'mobile_money'
- `provider`: Orange Money, Wave, Moov Money
- `phone`: Customer phone number

#### 2. `create-stripe-payment`

**Purpose**: Create Stripe PaymentIntent for card payments

**Location**: `supabase/functions/create-stripe-payment/index.ts`

**Two Modes**:

**A. Simple Mode** (Auto-conversion):
```typescript
Input:
  amount: 5000
  currency: 'XOF'
  event_id: 'uuid'
  order_id: 'uuid'

Process:
  1. Convert XOF to USD (5000 XOF → $8.86 USD @ 566 XOF/USD + 1.5% margin)
  2. Create Stripe PaymentIntent in USD
  3. Store both amounts in payment record

Output:
  clientSecret: 'pi_xxx_secret_xxx'
  paymentId: 'uuid'
  orderId: 'uuid'
  paymentToken: 'stripe-token-xxx'
```

**B. Advanced Mode** (Pre-calculated FX):
```typescript
Input:
  display_amount_minor: 5000          // XOF
  display_currency: 'XOF'
  charge_amount_minor: 886            // USD cents
  charge_currency: 'USD'
  fx_num: 100
  fx_den: 564
  fx_locked_at: '2025-10-13T...'
  event_id: 'uuid'
  order_id: 'uuid'

Process:
  1. Use provided FX rate
  2. Create Stripe PaymentIntent with exact USD amount
  3. Store FX details for reconciliation

Output:
  clientSecret: 'pi_xxx_secret_xxx'
  paymentId: 'uuid'
  orderId: 'uuid'
  paymentToken: 'stripe-token-xxx'
  fx_rate: '5.64'
```

**Key Features**:
- Idempotency: Checks `idempotency_keys` table
- Dual-currency: Stores both display and charge amounts
- FX tracking: Records exact exchange rate used
- Order linking: Associates payment with order_id

#### 3. `fx-quote`

**Purpose**: Get real-time FX quote for XOF to USD conversion

**Location**: `supabase/functions/fx-quote/index.ts`

**Flow**:
```typescript
1. Receive XOF amount request
2. Query fx_rates table for active USD→XOF rate
3. Apply margin (default 1.5% = 150 bps)
4. Calculate USD cents
5. Return locked quote

Example:
  Input: 5000 XOF
  FX Rate: 566 XOF/USD (from database)
  Margin: 1.5%
  Effective Rate: 574 XOF/USD
  Output: 886 USD cents ($8.86)
```

**Response**:
```typescript
{
  usd_cents: 886,
  fx_num: 100,
  fx_den: 574,
  fx_locked_at: '2025-10-13T10:30:00Z',
  margin_bps: 150,
  base_xof_per_usd: 566,
  effective_xof_per_usd: 574,
  display_amount: '5 000 FCFA',
  charge_amount: '$8.86 USD'
}
```

#### 4. `fetch-fx-rates`

**Purpose**: Fetch and cache live FX rates from external APIs

**Location**: `supabase/functions/fetch-fx-rates/index.ts`

**Scheduled**: Runs every hour via cron job

**Sources** (in fallback order):
1. XE.com API (if configured)
2. ExchangeRate-API.com (free tier)
3. Fixer.io (if configured)
4. Hardcoded fallback (566 XOF/USD)

**Flow**:
```typescript
1. Try each FX source in order
2. Parse USD→XOF rate
3. Validate rate is in acceptable range (300-1000)
4. Deactivate old rates
5. Insert new rate in fx_rates table
6. Set is_active = true
```

#### 5. `paydunya-ipn`

**Purpose**: Handle PayDunya webhook callbacks

**Location**: `supabase/functions/paydunya-ipn/index.ts`

**Flow**:
```typescript
1. Receive IPN POST from PayDunya
2. Validate webhook (IP whitelist, signature)
3. Log webhook in payment_webhooks table (idempotent by event_key)
4. Find payment by transaction_id
5. Update payment status
6. Update order status
7. Call admin_finalize_payment() to generate tickets
8. Return success response
```

**Handled Events**:
- `invoice.payment.completed` - Payment successful
- `invoice.payment.failed` - Payment failed
- `invoice.payment.pending` - Payment initiated

#### 6. `stripe-webhook`

**Purpose**: Handle Stripe webhook events

**Location**: `supabase/functions/stripe-webhook/index.ts`

**Flow**:
```typescript
1. Receive webhook POST from Stripe
2. Verify Stripe signature (webhook secret)
3. Construct event from raw body
4. Log webhook in payment_webhooks table (idempotent by event.id)
5. Handle event based on type
6. Update payment and order status
7. Create tickets directly (no separate function call)
8. Mark webhook as processed
9. Return success response
```

**Handled Events**:
- `payment_intent.succeeded` - Payment successful
  - Update payment to 'completed'
  - Set amount_paid from intent.amount_received
  - Update order to 'COMPLETED'
  - Generate tickets for order
  
- `payment_intent.payment_failed` - Payment failed
  - Update payment to 'failed'
  - Store failure reason in metadata

**Idempotency**:
- Checks if payment already in terminal state
- Prevents duplicate ticket creation
- Uses event.id as unique key

#### 7. `verify-payment`

**Purpose**: Unified payment verification for both providers

**Location**: `supabase/functions/verify-payment/index.ts`

**Flow**:
```typescript
1. Receive payment_token or internal_token
2. Detect provider:
   - Stripe: token starts with 'stripe-'
   - PayDunya: UUID or PayDunya token
3. Query payment record
4. Verify status with provider API if needed
5. Return unified status response

Response format:
{
  success: true/false,
  state: 'succeeded' | 'pending' | 'failed',
  payment_id: 'uuid',
  order_id: 'uuid',
  provider: 'stripe' | 'paydunya',
  message: 'Payment verified successfully'
}
```

---

## Frontend Components

### React Components

#### 1. `CheckoutForm.tsx`

**Purpose**: Main checkout form for authenticated users

**Location**: `src/components/checkout/CheckoutForm.tsx`

**Payment Method Routing**:
```typescript
const handleSubmit = async (e: FormEvent) => {
  if (paymentMethod === 'mobile_money') {
    // PayDunya flow
    const result = await orderService.createOrder({
      eventId,
      ticketQuantities: tickets,
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: {
        provider: formData.provider,
        phone: formData.phone
      }
    });
    
    if (result.paymentUrl) {
      window.location.href = result.paymentUrl; // Redirect to PayDunya
    }
  } else if (paymentMethod === 'card') {
    // Stripe flow
    // Create order first (returns orderId, no payment URL)
    const orderResult = await orderService.createOrder({
      eventId,
      ticketQuantities: tickets,
      paymentMethod: 'CARD'
    });
    
    // Then show Stripe payment form
    setOrderId(orderResult.orderId);
    setShowStripeForm(true);
  }
};
```

#### 2. `StripePaymentForm.tsx`

**Purpose**: Stripe Elements card input and payment confirmation

**Location**: `src/components/checkout/StripePaymentForm.tsx`

**Flow**:
```typescript
const handleSubmit = async () => {
  // Step 1: Get FX quote (optional)
  const fxQuote = await stripePaymentService.getFXQuote(xofAmountMinor);
  
  // Step 2: Create PaymentIntent
  const paymentResponse = await stripePaymentService.createPaymentAdvanced(
    xofAmountMinor,          // Display: 5000 XOF
    fxQuote.usd_cents,       // Charge: 886 USD cents
    fxQuote.fx_num,          // FX: 100/574
    fxQuote.fx_den,
    fxQuote.fx_locked_at,
    eventId,
    { user_id: userId, order_id: orderId }
  );
  
  // Step 3: Confirm payment with Stripe
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    paymentResponse.clientSecret,
    { payment_method: { card: cardElement } }
  );
  
  // Step 4: Handle result
  if (paymentIntent.status === 'succeeded') {
    onSuccess(paymentResponse.paymentId, orderId, paymentResponse.paymentToken);
  }
};
```

**Displays**:
- XOF amount (what user pays in local currency)
- USD amount (what card is charged)
- Exchange rate used
- Service fees breakdown

#### 3. `orderService.ts`

**Purpose**: Handles order creation and payment routing

**Location**: `src/services/orderService.ts`

**Key Method**:
```typescript
async createOrder(input: CreateOrderInput) {
  // 1. Create order record
  const order = await supabase.from('orders').insert({
    user_id: user.id,
    event_id: input.eventId,
    ticket_quantities: input.ticketQuantities,
    total: totalAmount,
    status: 'PENDING'
  }).single();
  
  // 2. Route based on payment method
  if (input.paymentMethod === 'CARD') {
    // Stripe flow: Return early, frontend handles payment
    return {
      orderId: order.id,
      success: true,
      paymentUrl: undefined  // No redirect needed
    };
  } else {
    // PayDunya flow: Create payment and return URL
    const paymentResponse = await paymentService.createPayment({
      order_id: order.id,
      method: 'mobile_money',
      amount_major: totalAmount,
      currency: 'XOF',
      ...input.paymentDetails
    });
    
    return {
      orderId: order.id,
      success: true,
      paymentUrl: paymentResponse.payment_url,  // Redirect to PayDunya
      paymentToken: paymentResponse.payment_token
    };
  }
}
```

#### 4. `stripePaymentService.ts`

**Purpose**: Stripe API wrapper for frontend

**Location**: `src/services/stripePaymentService.ts`

**Key Methods**:

```typescript
class StripePaymentService {
  // Get FX quote from backend
  async getFXQuote(xofAmountMinor: number): Promise<FXQuote> {
    const response = await supabase.functions.invoke('fx-quote', {
      body: { xof_amount_minor: xofAmountMinor, margin_bps: 150 }
    });
    return response.data;
  }
  
  // Create payment with pre-calculated FX
  async createPaymentAdvanced(
    displayAmountMinor: number,
    chargeAmountMinor: number,
    fxNum: number,
    fxDen: number,
    fxLockedAt: string,
    eventId: string,
    options: { user_id?: string; order_id?: string; }
  ): Promise<StripePaymentResponse> {
    const response = await supabase.functions.invoke('create-stripe-payment', {
      body: {
        display_amount_minor: displayAmountMinor,
        display_currency: 'XOF',
        charge_amount_minor: chargeAmountMinor,
        charge_currency: 'USD',
        fx_num: fxNum,
        fx_den: fxDen,
        fx_locked_at: fxLockedAt,
        event_id: eventId,
        ...options
      }
    });
    
    return response.data;
  }
  
  // Simple mode with auto-conversion
  async createPaymentSimple(
    amount: number,
    currency: string,
    eventId: string,
    options: { user_id?: string; order_id?: string; }
  ): Promise<StripePaymentResponse> {
    const response = await supabase.functions.invoke('create-stripe-payment', {
      body: {
        amount,
        currency,
        amount_is_minor: true,
        event_id: eventId,
        ...options
      }
    });
    
    return response.data;
  }
  
  // Generate idempotency key
  generateIdempotencyKey(): string {
    return `stripe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Currency Conversion System

### Why Dual-Currency?

**Problem**: Temba operates in West Africa (XOF) but Stripe works best with USD/EUR

**Solution**: Display prices in XOF, charge cards in USD

### FX Rate System Architecture

```
┌─────────────────────────────────────────────────┐
│         External FX Rate Sources                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ XE.com   │  │ ExchangeRate │  │ Fixer.io │ │
│  └──────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      fetch-fx-rates (Runs hourly)               │
│  - Fetches current USD→XOF rate                 │
│  - Validates rate (300-1000 range)              │
│  - Stores in fx_rates table                     │
│  - Marks as active                              │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      fx_rates Table (Rate Cache)                │
│  ┌────────────────────────────────────────────┐ │
│  │ from_currency: 'USD'                       │ │
│  │ to_currency: 'XOF'                         │ │
│  │ rate_decimal: 566.0000                     │ │
│  │ source: 'ExchangeRate-API'                 │ │
│  │ valid_from: 2025-10-13 10:00:00           │ │
│  │ valid_until: 2025-10-13 11:00:00          │ │
│  │ is_active: true                            │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      fx-quote Function                          │
│  Input: 5000 XOF                                │
│  Process:                                       │
│    1. Get active rate: 566 XOF/USD             │
│    2. Apply margin: 566 × 1.015 = 574          │
│    3. Calculate USD: 5000 / 574 = 8.71 USD     │
│    4. Convert to cents: 871 cents              │
│  Output: 871 USD cents, rate locked            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│      create-stripe-payment Function             │
│  Creates PaymentIntent with:                    │
│    - amount: 871 (USD cents)                    │
│    - currency: 'usd'                            │
│    - metadata: { display_amount: '5000 XOF' }  │
└─────────────────────────────────────────────────┘
```

### FX Rate Application

**Example Transaction**:

```
User Cart: 5000 XOF

1. Get FX Quote:
   Base Rate: 566 XOF/USD
   Margin: 1.5% (150 bps)
   Effective Rate: 574 XOF/USD
   
2. Convert to USD:
   5000 XOF / 574 = 8.71 USD
   871 USD cents
   
3. Create Payment:
   Display to user: "5 000 FCFA"
   Charge to card: "$8.71 USD"
   Exchange rate: "1 USD = 574 XOF"
   
4. Store in Database:
   display_amount_minor: 5000
   display_currency: 'XOF'
   charge_amount_minor: 871
   charge_currency: 'USD'
   fx_rate_numerator: 100
   fx_rate_denominator: 574
   fx_locked_at: '2025-10-13T10:30:00Z'
   fx_margin_bps: 150
```

### FX Rate Reconciliation

The system stores exact FX details to enable:

1. **Accounting**: Know exact rate used for each transaction
2. **Refunds**: Use same rate for refund calculations
3. **Reporting**: Track FX impact on revenue
4. **Compliance**: Audit trail for regulators

Query example:
```sql
SELECT 
  id,
  display_amount_minor || ' ' || display_currency AS shown_to_user,
  charge_amount_minor / 100.0 || ' ' || charge_currency AS charged_to_card,
  fx_rate_denominator / fx_rate_numerator::float AS exchange_rate,
  fx_locked_at AS rate_timestamp
FROM payments
WHERE provider = 'stripe'
  AND status = 'completed'
ORDER BY created_at DESC;
```

---

## Webhook Processing

### Idempotent Webhook Handling

Both PayDunya and Stripe webhooks are processed idempotently to handle retries safely.

### Stripe Webhook Processing

```typescript
// stripe-webhook/index.ts

1. Signature Verification:
   const signature = req.headers.get('stripe-signature');
   const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
   
2. Webhook Logging (Idempotent):
   await supabase.from('payment_webhooks').upsert({
     provider: 'stripe',
     event_type: event.type,
     event_key: event.id,  // Unique - prevents duplicates
     raw_payload: event,
     processed: false
   }, { onConflict: 'event_key' });
   
3. Handle Event:
   if (event.type === 'payment_intent.succeeded') {
     const intent = event.data.object;
     
     // Find payment
     const payment = await supabase
       .from('payments')
       .select('*')
       .eq('stripe_payment_intent_id', intent.id)
       .single();
     
     // Idempotency check
     if (['completed', 'succeeded'].includes(payment.status)) {
       return { received: true, note: 'Already processed' };
     }
     
     // Update payment
     await supabase.from('payments').update({
       status: 'completed',
       amount_paid: intent.amount_received / 100,
       completed_at: new Date().toISOString()
     }).eq('id', payment.id);
     
     // Update order
     await supabase.from('orders').update({
       status: 'COMPLETED'
     }).eq('id', payment.order_id);
     
     // Create tickets (with duplicate check)
     const existingTickets = await supabase
       .from('tickets')
       .select('id')
       .eq('order_id', payment.order_id);
     
     if (existingTickets.length === 0) {
       // Generate tickets based on order.ticket_quantities
       for (const [ticketTypeId, quantity] of Object.entries(order.ticket_quantities)) {
         for (let i = 0; i < quantity; i++) {
           await supabase.from('tickets').insert({
             order_id: order.id,
             event_id: order.event_id,
             user_id: order.user_id,
             ticket_type_id: ticketTypeId,
             status: 'VALID',
             payment_status: 'paid',
             payment_id: payment.id
           });
         }
       }
     }
     
     // Mark webhook as processed
     await supabase.from('payment_webhooks').update({
       processed: true
     }).eq('event_key', event.id);
   }
```

### PayDunya Webhook Processing

```typescript
// paydunya-ipn/index.ts

1. Validation:
   // Check IP whitelist
   // Verify signature if applicable
   
2. Webhook Logging:
   await supabase.from('payment_webhooks').upsert({
     provider: 'paydunya',
     event_type: 'ipn',
     event_key: data.invoice.token,
     raw_payload: data,
     processed: false
   }, { onConflict: 'event_key' });
   
3. Process IPN:
   const payment = await supabase
     .from('payments')
     .select('*')
     .eq('transaction_id', data.invoice.token)
     .single();
   
   if (data.status === 'completed') {
     // Update payment
     await supabase.from('payments').update({
       status: 'completed',
       completed_at: now()
     }).eq('id', payment.id);
     
     // Update order
     await supabase.from('orders').update({
       status: 'COMPLETED'
     }).eq('id', payment.order_id);
     
     // Call admin_finalize_payment to generate tickets
     await supabase.rpc('admin_finalize_payment', {
       p_payment_id: payment.id
     });
   }
```

---

## Payment Finalization

### `admin_finalize_payment()` Function

**Purpose**: Idempotent and concurrency-safe ticket generation

**Location**: Defined in migration `20251011000004_admin_finalize_payment_v2.sql`

**Key Features**:
1. **Row Locking**: Uses `FOR UPDATE` to prevent race conditions
2. **Idempotent**: Safe to call multiple times
3. **Delta Calculation**: Only creates missing tickets
4. **Batch Insert**: Uses `generate_series()` for efficient bulk inserts

**Algorithm**:
```sql
CREATE OR REPLACE FUNCTION admin_finalize_payment(p_payment_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_pay payments%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  -- 1. Lock payment row
  SELECT * INTO v_pay FROM payments WHERE id = p_payment_id FOR UPDATE;
  
  -- 2. Lock order row
  SELECT * INTO v_order FROM orders WHERE id = v_pay.order_id FOR UPDATE;
  
  -- 3. Update payment to completed (if not already)
  IF v_pay.status NOT IN ('completed', 'succeeded') THEN
    UPDATE payments SET 
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      amount_paid = COALESCE(amount_paid, 
        CASE WHEN charge_amount_minor IS NOT NULL
        THEN (charge_amount_minor::numeric / 100.0)
        ELSE amount END)
    WHERE id = p_payment_id;
  END IF;
  
  -- 4. Update order to COMPLETED
  UPDATE orders SET status = 'COMPLETED' WHERE id = v_order.id;
  
  -- 5. Calculate missing tickets per type
  FOR ticket_type_id, qty_to_create IN
    WITH wanted AS (
      SELECT (key::text)::uuid AS ticket_type_id,
             (value::text)::int AS qty_wanted
      FROM jsonb_each_text(v_order.ticket_quantities)
    ),
    existing AS (
      SELECT ticket_type_id, COUNT(*)::int AS qty_existing
      FROM tickets
      WHERE order_id = v_order.id
      GROUP BY ticket_type_id
    ),
    todo AS (
      SELECT w.ticket_type_id,
             GREATEST(w.qty_wanted - COALESCE(e.qty_existing, 0), 0) AS qty_to_create
      FROM wanted w
      LEFT JOIN existing e USING (ticket_type_id)
    )
    SELECT ticket_type_id, qty_to_create FROM todo
  LOOP
    -- 6. Insert missing tickets (batch)
    IF qty_to_create > 0 THEN
      INSERT INTO tickets (
        order_id, event_id, user_id, ticket_type_id,
        status, payment_status, payment_id, created_at
      )
      SELECT
        v_order.id,
        v_pay.event_id,
        v_pay.user_id,
        ticket_type_id,
        'VALID',
        'paid',
        p_payment_id,
        now()
      FROM generate_series(1, qty_to_create);
    END IF;
  END LOOP;
  
  -- 7. Return summary
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'order_id', v_order.id,
    'tickets_created', v_created_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why This Design?**:

1. **Concurrency-Safe**: Row locks prevent two webhooks from creating duplicate tickets
2. **Idempotent**: Can be called multiple times safely (only creates missing tickets)
3. **Efficient**: Uses batch inserts with `generate_series()` instead of row-by-row loops
4. **Flexible**: Works for both PayDunya and Stripe payments

**Usage**:
```sql
-- Called from webhook handlers
SELECT admin_finalize_payment('payment-uuid');

-- Returns:
{
  "success": true,
  "payment_id": "...",
  "order_id": "...",
  "tickets_created": 3,
  "per_type": [
    {"ticket_type_id": "...", "created": 2},
    {"ticket_type_id": "...", "created": 1}
  ]
}
```

---

## Security & Compliance

### PCI DSS Compliance

**Status**: PCI DSS SAQ-A compliant (merchant never touches card data)

**How**:
1. **Stripe Elements**: Card data goes directly to Stripe servers
2. **No Storage**: Never store full card numbers, CVV, or expiry dates
3. **Tokenization**: Only store Stripe payment method IDs
4. **HTTPS Only**: All communications over TLS 1.2+

### Webhook Security

#### Stripe Webhook Validation

```typescript
// Verify signature
const sig = req.headers.get('stripe-signature');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

try {
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  // Signature valid, process webhook
} catch (err) {
  // Signature invalid, reject webhook
  return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
    status: 400 
  });
}
```

#### PayDunya Webhook Validation

```typescript
// IP whitelist (PayDunya webhooks come from known IPs)
const allowedIPs = ['paydunya-ip-1', 'paydunya-ip-2'];
const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

if (!allowedIPs.includes(clientIP)) {
  return new Response('Forbidden', { status: 403 });
}

// Additional signature verification if available
```

### Idempotency Keys

**Purpose**: Prevent duplicate payments from retries

**Implementation**:
```typescript
// Generate on frontend
const idempotencyKey = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Check in backend
const existing = await supabase
  .from('idempotency_keys')
  .select('payment_id')
  .eq('key', idempotencyKey)
  .maybeSingle();

if (existing) {
  // Return existing payment
  return existingPayment;
} else {
  // Create new payment
  // Store idempotency key
  await supabase.from('idempotency_keys').insert({
    key: idempotencyKey,
    payment_id: newPayment.id
  });
}
```

### Row-Level Security (RLS)

```sql
-- Users can only see their own payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all payments
CREATE POLICY "Service role can manage all payments" ON payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Webhooks table: service role only
CREATE POLICY "Service role can manage all webhooks" ON payment_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

---

## Error Handling

### Frontend Error Handling

```typescript
// CheckoutForm.tsx
try {
  const result = await orderService.createOrder(...);
  
  if (!result.success) {
    toast.error(result.error || 'Payment failed');
    return;
  }
  
  // Success
} catch (error) {
  console.error('Payment error:', error);
  toast.error(error.message || 'An error occurred');
}
```

### Backend Error Handling

```typescript
// create-stripe-payment/index.ts
try {
  // Create PaymentIntent
  const intent = await stripe.paymentIntents.create(...);
  
  // Create payment record
  const payment = await supabase.from('payments').insert(...);
  
  return new Response(JSON.stringify({ clientSecret: intent.client_secret }), {
    headers: cors
  });
  
} catch (e) {
  console.error('Error:', e.message);
  
  return new Response(JSON.stringify({ 
    error: e.message,
    type: e.type || 'unknown_error'
  }), { 
    status: 500,
    headers: cors 
  });
}
```

### Webhook Error Handling

```typescript
// stripe-webhook/index.ts
try {
  // Process webhook
  await processPaymentSuccess(intent);
  
  return new Response(JSON.stringify({ received: true }), {
    headers: cors
  });
  
} catch (e) {
  console.error('Webhook processing error:', e);
  
  // Log error in webhook table
  await supabase.from('payment_webhooks').update({
    processed: false,
    error_message: e.message
  }).eq('event_key', event.id);
  
  // Return 500 to trigger Stripe retry
  return new Response(JSON.stringify({ error: e.message }), {
    status: 500,
    headers: cors
  });
}
```

### Payment Recovery

For stuck payments, admin can manually trigger finalization:

```sql
-- Check payment status
SELECT id, status, order_id, created_at 
FROM payments 
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Manually finalize (if payment actually succeeded)
SELECT admin_finalize_payment('payment-uuid');
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test FX conversion
describe('FX Quote', () => {
  it('should convert XOF to USD correctly', async () => {
    const quote = await getFXQuote(5000, 150);
    
    expect(quote.usd_cents).toBeGreaterThan(0);
    expect(quote.effective_xof_per_usd).toBeGreaterThan(quote.base_xof_per_usd);
    expect(quote.fx_num).toBe(100);
  });
});

// Test payment creation
describe('Create Stripe Payment', () => {
  it('should create PaymentIntent with correct amounts', async () => {
    const result = await createStripePayment({
      display_amount_minor: 5000,
      display_currency: 'XOF',
      charge_amount_minor: 886,
      charge_currency: 'USD',
      event_id: 'test-event',
      order_id: 'test-order'
    });
    
    expect(result.clientSecret).toBeDefined();
    expect(result.paymentId).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// Test complete payment flow
describe('Complete Payment Flow', () => {
  it('should process card payment end-to-end', async () => {
    // 1. Create order
    const order = await createOrder({
      eventId: 'test-event',
      ticketQuantities: { 'type-1': 2 },
      paymentMethod: 'CARD'
    });
    
    // 2. Create payment
    const payment = await createStripePayment({
      order_id: order.id,
      amount: 5000,
      currency: 'XOF'
    });
    
    // 3. Simulate webhook
    await simulateStripeWebhook({
      type: 'payment_intent.succeeded',
      data: { object: { id: payment.stripe_payment_intent_id } }
    });
    
    // 4. Verify tickets created
    const tickets = await getTickets(order.id);
    expect(tickets).toHaveLength(2);
    expect(tickets[0].status).toBe('VALID');
  });
});
```

### Test Cards (Stripe)

```
Success:              4242 4242 4242 4242
Decline:              4000 0000 0000 0002
3D Secure Required:   4000 0025 0000 3155
Insufficient Funds:   4000 0000 0000 9995
```

### Manual Testing Checklist

**Stripe Payments**:
- [ ] Successful card payment
- [ ] Declined card
- [ ] 3D Secure flow
- [ ] Network failure during payment
- [ ] Webhook retry handling
- [ ] Duplicate webhook processing
- [ ] FX rate validation
- [ ] Amount reconciliation (XOF vs USD)

**PayDunya Payments**:
- [ ] Orange Money payment
- [ ] Wave payment
- [ ] Moov Money payment
- [ ] Payment timeout
- [ ] User cancellation
- [ ] Webhook delivery

**Edge Cases**:
- [ ] Multiple rapid payment attempts
- [ ] Webhook arrives before frontend redirect
- [ ] Payment succeeds but webhook fails
- [ ] Order exists but payment fails
- [ ] Race condition: two webhooks simultaneously

---

## Monitoring & Alerts

### Key Metrics

1. **Payment Success Rate**: `(completed_payments / total_payments) * 100`
2. **Average Processing Time**: Time from payment creation to completion
3. **Webhook Delivery Rate**: `(processed_webhooks / total_webhooks) * 100`
4. **FX Rate Freshness**: Age of active FX rate

### Monitoring Queries

```sql
-- Payment success rate by provider (last 24h)
SELECT 
  provider,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 2) AS success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;

-- Unprocessed webhooks
SELECT *
FROM payment_webhooks
WHERE processed = false
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Stale FX rates
SELECT *
FROM fx_rates
WHERE is_active = true
  AND valid_from < NOW() - INTERVAL '2 hours';

-- Pending payments (potential issues)
SELECT id, provider, amount, created_at, 
       NOW() - created_at AS age
FROM payments
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;
```

### Alerts to Configure

1. **Payment Failure Rate > 10%** (last hour)
2. **Unprocessed Webhooks > 5** (last 10 minutes)
3. **FX Rate Not Updated** (last 2 hours)
4. **Stripe API Error** (any 5xx response)
5. **PayDunya API Error** (any timeout or 5xx)

---

## Summary

The hybrid payment system provides:

✅ **Optimized Routing**: Mobile money → PayDunya, Cards → Stripe  
✅ **Dual-Currency**: Display in XOF, charge in USD (when applicable)  
✅ **Real-Time FX**: Hourly rate updates with margin  
✅ **Idempotent**: Safe webhook and payment processing  
✅ **Automated**: Ticket generation on success  
✅ **Secure**: PCI compliant, webhook verification  
✅ **Auditable**: Complete FX and payment trail  

**Next Steps**:
- Review monitoring dashboards
- Test payment flows in staging
- Verify webhook endpoints
- Check FX rate updates

---

*For additional documentation, see:*
- `HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md` - Full implementation guide
- `HYBRID-PAYMENT-QUICKSTART.md` - 30-minute setup guide
- `STRIPE-SETUP-GUIDE.md` - Stripe configuration details

