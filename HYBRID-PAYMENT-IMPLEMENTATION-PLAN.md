# Hybrid Payment Implementation Plan
## PayDunya (Mobile Money) + Stripe (Credit/Debit Cards)

**Version:** 1.0  
**Last Updated:** October 11, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document outlines the comprehensive plan to implement a hybrid payment system for the Temba ticketing platform:
- **PayDunya**: Mobile money payments (Orange Money, Wave, Moov Money)
- **Stripe**: Credit/debit card payments (Visa, Mastercard, Amex)

### Benefits
1. **Better UX**: Stripe provides superior card payment experience with modern UI components
2. **Regional Optimization**: PayDunya excels at mobile money for African markets
3. **Lower Fees**: Competitive rates from both providers for their specialties
4. **Redundancy**: Fallback options if one provider experiences downtime
5. **Global Reach**: Stripe enables international card payments better

---

## Current Architecture Analysis

### Current Payment Flow
```
User → CheckoutForm → orderService → create-payment (Supabase Function)
                                      ↓
                                   PayDunya API (for both card & mobile)
                                      ↓
                                   PayDunya Redirect
                                      ↓
                                   paydunya-ipn (Webhook)
                                      ↓
                                   verify-payment
                                      ↓
                                   Ticket Generation
```

### Current Components
1. **Frontend:**
   - `CheckoutForm.tsx` - Authenticated users
   - `GuestCheckoutForm.tsx` - Guest checkout
   - `paymentService.ts` - Payment API wrapper
   - `PaymentSuccess.tsx` - Success page

2. **Backend (Supabase Functions):**
   - `create-payment/index.ts` - Creates PayDunya payment
   - `verify-payment/index.ts` - Verifies payment status
   - `paydunya-ipn/index.ts` - Handles PayDunya webhooks

3. **Database Tables:**
   - `payments` - Payment records
   - `orders` - Order records
   - `tickets` - Generated tickets
   - `payment_methods` - Saved payment methods

---

## Proposed Architecture

### New Payment Flow

```
User Selects Payment Method
        ↓
    ┌───┴───┐
    │       │
Mobile    Card
Money     Payment
    │       │
    ↓       ↓
PayDunya  Stripe
  API      API
    │       │
    ↓       ↓
PayDunya  Stripe
Redirect  Checkout
    │       │
    ↓       ↓
PayDunya  Stripe
Webhook   Webhook
    │       │
    └───┬───┘
        ↓
   Verify Payment
        ↓
   Generate Tickets
```

### Component Changes

#### A. Frontend Changes

**1. Update Payment Method Selection**
```typescript
// Enhanced payment method types
type PaymentProvider = 'paydunya' | 'stripe';
type PaymentMethod = 'mobile_money' | 'card';

interface PaymentConfig {
  method: PaymentMethod;
  provider: PaymentProvider;
}
```

**2. New/Updated Components:**
- ✅ `CheckoutForm.tsx` - Add Stripe Elements integration for cards
- ✅ `GuestCheckoutForm.tsx` - Add Stripe Elements integration
- ✅ `paymentService.ts` - Add Stripe payment methods
- ✅ `StripeCardInput.tsx` - NEW: Stripe Card Element wrapper
- ✅ `PaymentMethodSelector.tsx` - Enhanced selector with provider badges

**3. Payment Service Updates:**
```typescript
// src/services/paymentService.ts
class PaymentService {
  // Existing PayDunya methods
  async createPaydunyaPayment(request): Promise<PaymentResponse>
  
  // NEW Stripe methods
  async createStripePaymentIntent(request): Promise<StripePaymentResponse>
  async confirmStripePayment(clientSecret, cardElement): Promise<StripeResult>
  async handleStripeRedirect(): Promise<StripeResult>
  
  // Universal method that routes to appropriate provider
  async createPayment(request): Promise<UnifiedPaymentResponse>
}
```

#### B. Backend Changes (Supabase Functions)

**1. New Functions to Create:**

**`create-stripe-payment/index.ts`**
```typescript
// Purpose: Create Stripe PaymentIntent for card payments
// Flow:
//   1. Validate request and auth
//   2. Create payment record in DB
//   3. Create Stripe PaymentIntent
//   4. Return client_secret for frontend
//   5. Store stripe_payment_intent_id in DB
```

**`stripe-webhook/index.ts`**
```typescript
// Purpose: Handle Stripe webhook events
// Events to handle:
//   - payment_intent.succeeded
//   - payment_intent.payment_failed
//   - charge.refunded
//   - charge.disputed
// Security:
//   - Verify Stripe webhook signature
//   - Idempotency checks
//   - Update payment & order status
//   - Generate tickets on success
```

**2. Functions to Update:**

**`create-payment/index.ts`**
```typescript
// Add routing logic:
if (payload.method === 'mobile_money') {
  // Existing PayDunya flow
} else if (payload.method === 'credit_card') {
  // Route to create-stripe-payment
}
```

**`verify-payment/index.ts`**
```typescript
// Add Stripe verification:
if (payment.provider === 'stripe') {
  // Verify with Stripe API
} else if (payment.provider === 'paydunya') {
  // Existing PayDunya verification
}
```

#### C. Database Schema Updates

**1. Update `payments` table:**
```sql
ALTER TABLE payments 
ADD COLUMN provider TEXT CHECK (provider IN ('paydunya', 'stripe')),
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_charge_id TEXT,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_payment_method_id TEXT,
ADD COLUMN card_last4 TEXT,
ADD COLUMN card_brand TEXT,
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for Stripe lookups
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_provider ON payments(provider);
```

**2. Create `payment_webhooks` table (if not exists):**
```sql
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paydunya', 'stripe')),
  event_type TEXT NOT NULL,
  event_id TEXT UNIQUE,
  event_key TEXT NOT NULL,
  status TEXT NOT NULL,
  raw JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  client_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhooks_event_id ON payment_webhooks(event_id);
CREATE INDEX idx_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed);
```

**3. Update `payment_methods` table:**
```sql
ALTER TABLE payment_methods
ADD COLUMN provider TEXT CHECK (provider IN ('paydunya', 'stripe')),
ADD COLUMN stripe_payment_method_id TEXT,
ADD COLUMN stripe_customer_id TEXT;
```

---

## Implementation Phases

### Phase 1: Foundation & Setup (Week 1)
**Duration:** 3-5 days

#### Tasks:
1. **Stripe Account Setup**
   - [ ] Create Stripe account (or use existing)
   - [ ] Get API keys (test & live)
   - [ ] Configure webhook endpoints
   - [ ] Set up payment methods (cards)
   - [ ] Configure 3D Secure settings

2. **Environment Configuration**
   ```bash
   # .env additions
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
   
   # Supabase secrets
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_LIVE_SECRET_KEY=sk_live_...
   STRIPE_LIVE_WEBHOOK_SECRET=whsec_...
   ```

3. **Install Dependencies**
   ```bash
   # Frontend
   npm install @stripe/stripe-js @stripe/react-stripe-js
   
   # Backend (already available in Deno)
   # Stripe API will be called via fetch
   ```

4. **Database Schema Updates**
   - [ ] Run migration to update `payments` table
   - [ ] Create `payment_webhooks` table
   - [ ] Update `payment_methods` table
   - [ ] Add necessary indexes

#### Deliverables:
- ✅ Stripe account configured
- ✅ Environment variables set
- ✅ Database schema updated
- ✅ Dependencies installed

---

### Phase 2: Backend Implementation (Week 1-2)
**Duration:** 5-7 days

#### Task 1: Create Stripe Payment Function
**File:** `supabase/functions/create-stripe-payment/index.ts`

```typescript
import { createClient } from "@supabase/supabase-js@2";
import Stripe from "stripe"; // Types only, will use fetch

interface CreateStripePaymentRequest {
  idempotency_key: string;
  user_id?: string;
  buyer_email?: string;
  event_id: string;
  order_id?: string;
  amount_major: number;
  currency: string;
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;
    currency: string;
  }>;
  payment_method_id?: string; // For saved cards
  save_method?: boolean;
  return_url?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  // 1. Parse and validate request
  // 2. Authenticate user or validate guest email
  // 3. Create payment record in DB
  // 4. Create Stripe PaymentIntent
  // 5. Return client_secret + payment_id
});
```

**Key Features:**
- Support for saved payment methods
- Automatic payment methods (card)
- 3D Secure / SCA compliance
- Customer creation for registered users
- Comprehensive error handling
- Idempotency for duplicate requests

#### Task 2: Create Stripe Webhook Handler
**File:** `supabase/functions/stripe-webhook/index.ts`

```typescript
Deno.serve(async (req) => {
  // 1. Verify Stripe signature
  // 2. Parse webhook event
  // 3. Handle based on event type:
  //    - payment_intent.succeeded
  //    - payment_intent.payment_failed
  //    - charge.refunded
  //    - charge.disputed
  // 4. Update payment status
  // 5. Generate tickets on success
  // 6. Send notifications
});
```

**Events to Handle:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled
- `charge.refunded` - Refund processed
- `charge.dispute.created` - Dispute initiated

#### Task 3: Update Universal Payment Router
**File:** `supabase/functions/create-payment/index.ts`

```typescript
// Add routing logic
const payload = await req.json();

if (payload.method === 'mobile_money') {
  // Existing PayDunya flow
  return await handlePaydunyaPayment(payload);
} else if (payload.method === 'credit_card' || payload.method === 'card') {
  // New: Route to Stripe
  return await handleStripePayment(payload);
} else {
  throw new Error(`Unknown payment method: ${payload.method}`);
}
```

#### Task 4: Update Payment Verification
**File:** `supabase/functions/verify-payment/index.ts`

```typescript
// Add provider detection and routing
const payment = await getPaymentFromDB(payment_id);

if (payment.provider === 'stripe') {
  return await verifyStripePayment(payment);
} else if (payment.provider === 'paydunya') {
  return await verifyPaydunyaPayment(payment);
}
```

#### Deliverables:
- ✅ `create-stripe-payment` function
- ✅ `stripe-webhook` function
- ✅ Updated `create-payment` router
- ✅ Updated `verify-payment` function
- ✅ Unit tests for all functions

---

### Phase 3: Frontend Implementation (Week 2)
**Duration:** 5-7 days

#### Task 1: Stripe Context Provider
**File:** `src/context/StripeContext.tsx`

```typescript
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
```

#### Task 2: Stripe Card Input Component
**File:** `src/components/checkout/StripeCardInput.tsx`

```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function StripeCardInput({ 
  onPaymentMethodReady, 
  disabled 
}: StripeCardInputProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  // Styled card input with validation
  // Returns payment method ID when ready
}
```

**Features:**
- Real-time validation
- Card brand detection
- Error messages in French
- Accessible design
- Mobile-responsive

#### Task 3: Update CheckoutForm
**File:** `src/components/checkout/CheckoutForm.tsx`

```typescript
// Changes needed:
1. Add Stripe Elements wrapper
2. Conditional rendering:
   - Mobile Money → PayDunya flow (existing)
   - Card Payment → Stripe flow (new)
3. Handle Stripe confirmCardPayment()
4. Update saved payment methods to include Stripe cards
5. Add loading states for Stripe
```

**Key Changes:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (paymentMethod === 'mobile_money') {
    // Existing PayDunya flow
    await handlePaydunyaPayment();
  } else if (paymentMethod === 'card') {
    // New Stripe flow
    await handleStripePayment();
  }
};

const handleStripePayment = async () => {
  // 1. Create PaymentIntent (get client_secret)
  const { clientSecret, orderId } = await paymentService.createStripePayment({
    amount: totalAmount,
    currency,
    eventId,
    ticketQuantities: tickets
  });
  
  // 2. Confirm payment with Stripe Elements
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: formData.cardholderName,
          email: user?.email
        }
      }
    }
  );
  
  // 3. Handle result
  if (error) {
    toast.error(error.message);
  } else if (paymentIntent.status === 'succeeded') {
    navigate(`/payment/success?order=${orderId}`);
  }
};
```

#### Task 4: Update Payment Service
**File:** `src/services/paymentService.ts`

```typescript
class PaymentService {
  // New Stripe methods
  async createStripePayment(request: CreatePaymentRequest) {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-stripe-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(request)
      }
    );
    
    const data = await response.json();
    return {
      clientSecret: data.client_secret,
      paymentId: data.payment_id,
      orderId: data.order_id
    };
  }
  
  async verifyStripePayment(paymentIntentId: string) {
    // Call verify-payment with Stripe payment intent ID
  }
  
  // Update existing createPayment to route appropriately
  async createPayment(request: CreatePaymentRequest) {
    if (request.paymentMethod === 'MOBILE_MONEY') {
      return this.createPaydunyaPayment(request);
    } else if (request.paymentMethod === 'CARD') {
      return this.createStripePayment(request);
    }
  }
}
```

#### Task 5: Update Success Page
**File:** `src/pages/PaymentSuccess.tsx`

```typescript
// Add Stripe payment verification
const verifyPayment = async () => {
  // Detect payment provider from URL params or DB
  const provider = await detectPaymentProvider(orderId);
  
  if (provider === 'stripe') {
    // Verify Stripe payment
    const paymentIntent = await stripe.retrievePaymentIntent(clientSecret);
    if (paymentIntent.status === 'succeeded') {
      setSuccess(true);
    }
  } else if (provider === 'paydunya') {
    // Existing PayDunya verification
  }
};
```

#### Deliverables:
- ✅ Stripe context and provider
- ✅ StripeCardInput component
- ✅ Updated CheckoutForm with Stripe integration
- ✅ Updated GuestCheckoutForm
- ✅ Updated paymentService
- ✅ Updated PaymentSuccess page
- ✅ UI tests for all components

---

### Phase 4: Testing & QA (Week 3)
**Duration:** 3-5 days

#### Test Cases

**1. Stripe Card Payments**
- [ ] Test successful payment with Visa
- [ ] Test successful payment with Mastercard
- [ ] Test successful payment with Amex
- [ ] Test declined card
- [ ] Test insufficient funds
- [ ] Test 3D Secure authentication
- [ ] Test saved card payment
- [ ] Test guest card payment

**2. PayDunya Mobile Money** (Regression)
- [ ] Test Orange Money payment
- [ ] Test Wave payment
- [ ] Test Moov Money payment
- [ ] Test saved mobile money account
- [ ] Test guest mobile money payment

**3. Edge Cases**
- [ ] Test payment timeout
- [ ] Test duplicate payment prevention
- [ ] Test webhook replay attacks
- [ ] Test concurrent payments
- [ ] Test network failures
- [ ] Test partial refunds
- [ ] Test full refunds

**4. Integration Tests**
- [ ] Test complete checkout flow (both providers)
- [ ] Test ticket generation after payment
- [ ] Test email notifications
- [ ] Test payment method saving
- [ ] Test default payment method selection

**5. Security Tests**
- [ ] Verify webhook signature validation
- [ ] Test CSRF protection
- [ ] Test rate limiting
- [ ] Test input sanitization
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention

#### Test Cards (Stripe)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3DS Required: 4000 0027 6000 3184
Insufficient Funds: 4000 0000 0000 9995
```

#### Deliverables:
- ✅ All test cases passing
- ✅ Test coverage > 80%
- ✅ Load testing completed
- ✅ Security audit passed

---

### Phase 5: Production Deployment (Week 3-4)
**Duration:** 2-3 days

#### Pre-Deployment Checklist

**1. Configuration**
- [ ] Switch to live Stripe API keys
- [ ] Update webhook URLs to production
- [ ] Configure Stripe production settings
- [ ] Set up monitoring and alerts
- [ ] Configure error tracking (Sentry)

**2. Database**
- [ ] Run production migrations
- [ ] Backup existing data
- [ ] Verify indexes created
- [ ] Test rollback procedure

**3. Security**
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up IP whitelisting (if needed)
- [ ] Enable logging and monitoring
- [ ] Review and restrict API keys access

**4. Documentation**
- [ ] Update API documentation
- [ ] Create runbook for payment issues
- [ ] Document troubleshooting steps
- [ ] Create admin dashboard guide

#### Deployment Steps

1. **Deploy Backend Functions**
   ```bash
   # Deploy new Stripe functions
   supabase functions deploy create-stripe-payment
   supabase functions deploy stripe-webhook
   
   # Update existing functions
   supabase functions deploy create-payment
   supabase functions deploy verify-payment
   ```

2. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to your hosting (Netlify/Vercel)
   ```

3. **Configure Webhooks**
   - PayDunya webhook: `https://your-domain.com/functions/v1/paydunya-ipn`
   - Stripe webhook: `https://your-domain.com/functions/v1/stripe-webhook`

4. **Smoke Tests**
   - Test one real payment with each provider
   - Verify webhooks are received
   - Check ticket generation
   - Test email notifications

#### Rollback Plan

If issues occur:
```bash
# 1. Revert frontend deployment
# 2. Disable new Stripe functions
supabase functions delete create-stripe-payment
supabase functions delete stripe-webhook

# 3. Revert database migrations
# 4. Monitor for any stuck payments
```

---

## Configuration Details

### Environment Variables

**Frontend (.env)**
```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...

# PayDunya (existing)
VITE_PAYDUNYA_MODE=live
```

**Backend (Supabase Secrets)**
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_...

# PayDunya (existing)
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_PUBLIC_KEY=...
PAYDUNYA_TOKEN=...
PAYDUNYA_MODE=live
```

**Set Supabase Secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Security Considerations

### 1. PCI Compliance
- ✅ **Never store raw card data** - Use Stripe Elements (PCI SAQ-A compliant)
- ✅ **Use HTTPS** - Enforce SSL/TLS for all connections
- ✅ **Tokenization** - Card data only touches Stripe servers
- ✅ **3D Secure** - Enable SCA for European customers

### 2. Webhook Security
```typescript
// Stripe webhook signature verification
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);

// PayDunya webhook verification
const isValidIP = verifyPaydunyaIP(clientIP);
const isValidSignature = verifyPaydunyaSignature(body, signature);
```

### 3. Fraud Prevention
- Rate limiting on payment attempts
- Duplicate payment prevention (idempotency keys)
- Amount validation
- IP logging and monitoring
- Velocity checks

### 4. Data Privacy
- Store minimal card data (last 4 digits, brand only)
- Encrypt sensitive data at rest
- Implement data retention policies
- GDPR compliance for European users

---

## Monitoring & Alerting

### Key Metrics to Track

**Payment Success Rates**
```
Stripe Card Payments:
- Success rate > 95%
- Average processing time < 3s
- 3DS completion rate > 90%

PayDunya Mobile Money:
- Success rate > 90%
- Average processing time < 30s
- Callback success rate > 95%
```

### Alerts to Configure

1. **Payment Failures**
   - Alert if failure rate > 10% in 1 hour
   - Alert if no successful payments in 2 hours

2. **Webhook Failures**
   - Alert if webhook endpoint returns 500
   - Alert if webhook processing time > 30s

3. **Security Events**
   - Alert on suspicious payment patterns
   - Alert on repeated failed attempts from same IP
   - Alert on webhook signature failures

### Logging Strategy

```typescript
// Structured logging for payments
console.log({
  event: 'payment_created',
  provider: 'stripe' | 'paydunya',
  payment_id: 'pay_xxx',
  amount: 5000,
  currency: 'XOF',
  user_id: 'user_xxx',
  timestamp: new Date().toISOString()
});
```

---

## Cost Analysis

### Stripe Fees
- **Cards:** 2.9% + €0.30 per transaction
- **3D Secure:** Included
- **International cards:** Additional 1.5%
- **No monthly fees**

### PayDunya Fees (Typical)
- **Mobile Money:** 2-3% per transaction
- **Cards:** 3-5% per transaction
- **No monthly fees**

### Recommended Strategy
```
Mobile Money → PayDunya (lower fees, better UX for Africa)
Credit Cards → Stripe (better UX, lower fees, global reach)
```

**Estimated Savings:**
- Assuming 50/50 split (mobile vs cards)
- Average transaction: XOF 5,000
- 1,000 transactions/month

**Current (PayDunya only):**
- Total fees: ~XOF 125,000 - 200,000/month

**Hybrid (PayDunya + Stripe):**
- Total fees: ~XOF 100,000 - 150,000/month
- **Savings: ~25-33%**

---

## User Experience Flow

### Mobile Money Payment (PayDunya)
```
1. User selects "Mobile Money"
2. User selects provider (Orange, Wave, Moov)
3. User enters phone number
4. User clicks "Pay"
5. Redirect to PayDunya
6. User completes payment on provider app
7. Redirect back to success page
8. Tickets generated immediately
```

### Card Payment (Stripe)
```
1. User selects "Card"
2. User enters card details (Stripe Elements)
3. Real-time validation shows card brand
4. User clicks "Pay"
5. 3D Secure challenge (if required)
6. Payment processed instantly
7. Success page with tickets
8. No redirect needed (seamless)
```

### Saved Payment Methods
```
1. User sees saved methods:
   - Orange Money: +226 XX XX XX XX
   - Visa: •••• 4242
   - Wave: +226 YY YY YY YY
2. User selects method
3. One-click payment
4. Instant confirmation
```

---

## Migration Strategy

### Existing Orders & Payments
- No migration needed - keep existing PayDunya payments as-is
- New column `provider` will be NULL for old payments
- Update existing payments query to handle NULL provider:
  ```sql
  SELECT * FROM payments 
  WHERE provider IS NULL OR provider = 'paydunya';
  ```

### Saved Payment Methods
- Existing saved methods remain PayDunya
- Add `provider` column to distinguish
- Mobile money defaults to PayDunya
- Cards can be either PayDunya or Stripe
- User can save both types

### Data Cleanup
```sql
-- Mark old payments as PayDunya
UPDATE payments 
SET provider = 'paydunya' 
WHERE provider IS NULL;

-- Mark old saved methods
UPDATE payment_methods 
SET provider = 'paydunya' 
WHERE provider IS NULL AND method_type = 'mobile_money';
```

---

## Troubleshooting Guide

### Common Issues

**1. Stripe Payment Fails**
```
Problem: Payment declined
Cause: Card declined by bank
Solution: Ask user to try different card or contact bank

Problem: 3D Secure fails
Cause: User doesn't complete authentication
Solution: Clear explanation, retry option

Problem: Invalid API key
Cause: Wrong environment keys
Solution: Verify STRIPE_SECRET_KEY is correct for environment
```

**2. PayDunya Issues** (Existing)
```
Problem: Callback not received
Cause: Webhook endpoint blocked
Solution: Verify URL is accessible, check firewall

Problem: Payment stuck in pending
Cause: User abandoned payment
Solution: Auto-cancel after 30 minutes
```

**3. Webhook Issues**
```
Problem: Duplicate webhooks
Cause: Stripe/PayDunya retries
Solution: Idempotency checks, event_id tracking

Problem: Webhook signature invalid
Cause: Wrong webhook secret
Solution: Verify secret matches dashboard
```

---

## Testing Checklist

### Before Production
- [ ] Test with test cards (Stripe)
- [ ] Test with test phone numbers (PayDunya)
- [ ] Test saved payment methods
- [ ] Test guest checkout (both providers)
- [ ] Test refunds (both providers)
- [ ] Test webhooks (both providers)
- [ ] Test concurrent payments
- [ ] Test error handling
- [ ] Load test (100 concurrent users)
- [ ] Security scan completed

### After Production Deploy
- [ ] Test real payment (small amount)
- [ ] Verify webhooks received
- [ ] Check ticket generation
- [ ] Test email notifications
- [ ] Monitor error rates for 48 hours
- [ ] Verify analytics tracking
- [ ] Test on mobile devices
- [ ] Test on different browsers

---

## Success Criteria

### Technical
- ✅ Payment success rate > 95%
- ✅ Average processing time < 3s (Stripe)
- ✅ No critical security vulnerabilities
- ✅ Zero data leaks
- ✅ 99.9% uptime

### Business
- ✅ Lower transaction fees by 25-33%
- ✅ Better conversion rates
- ✅ Reduced payment abandonment
- ✅ Positive user feedback
- ✅ Support for international customers

### User Experience
- ✅ Seamless checkout flow
- ✅ Clear error messages (French)
- ✅ Mobile-responsive design
- ✅ One-click payments for saved methods
- ✅ Fast ticket delivery

---

## Timeline Summary

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Phase 1: Setup | 3-5 days | Stripe account, env config, DB schema | ⏳ Pending |
| Phase 2: Backend | 5-7 days | Supabase functions, webhooks | ⏳ Pending |
| Phase 3: Frontend | 5-7 days | UI components, integration | ⏳ Pending |
| Phase 4: Testing | 3-5 days | QA, security, load testing | ⏳ Pending |
| Phase 5: Deployment | 2-3 days | Production deploy, monitoring | ⏳ Pending |
| **Total** | **18-27 days** | **~3-4 weeks** | ⏳ Pending |

---

## Next Steps

### Immediate Actions (This Week)
1. [ ] Review and approve this plan
2. [ ] Create Stripe account (if not exists)
3. [ ] Set up staging/test environment
4. [ ] Install required dependencies
5. [ ] Create project board for tracking

### Week 1 Tasks
1. [ ] Configure Stripe account
2. [ ] Update database schema
3. [ ] Create basic Stripe payment function
4. [ ] Test Stripe payment in isolation

### Week 2 Tasks
1. [ ] Complete all backend functions
2. [ ] Integrate Stripe Elements in frontend
3. [ ] Test end-to-end flow
4. [ ] Update documentation

### Week 3-4 Tasks
1. [ ] Complete QA testing
2. [ ] Security audit
3. [ ] Production deployment
4. [ ] Monitor and optimize

---

## Resources & References

### Documentation
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Elements Guide](https://stripe.com/docs/stripe-js)
- [PayDunya API Docs](https://paydunya.com/developers)
- [Supabase Functions](https://supabase.com/docs/guides/functions)

### Code Examples
- [Stripe React Integration](https://github.com/stripe/react-stripe-js)
- [Stripe Webhook Handler](https://stripe.com/docs/webhooks)
- [3D Secure Implementation](https://stripe.com/docs/strong-customer-authentication)

### Tools
- Stripe Dashboard: https://dashboard.stripe.com
- PayDunya Dashboard: https://app.paydunya.com
- Webhook Testing: https://webhook.site

---

## Support & Maintenance

### Post-Launch Support
- Monitor payment success rates daily (first week)
- Weekly review of error logs
- Monthly reconciliation of payments
- Quarterly security review

### Documentation Updates
- Keep runbook updated with new issues
- Document all configuration changes
- Update user guides as needed
- Maintain API changelog

---

## Conclusion

This hybrid payment approach combines the best of both worlds:
- **PayDunya** excels at mobile money for African markets
- **Stripe** provides superior card payment experience globally

**Expected Benefits:**
1. 25-33% reduction in payment processing fees
2. Better user experience with Stripe's modern UI
3. Higher conversion rates for card payments
4. Improved international customer support
5. Redundancy and reliability

**Timeline:** 3-4 weeks for complete implementation and testing

**Next Step:** Review and approve this plan, then proceed with Phase 1 (Setup)

---

*For questions or clarifications, contact the development team.*

