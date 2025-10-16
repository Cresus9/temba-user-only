# Hybrid Payment System - Quick Reference

**For:** Developers integrating or maintaining the payment system  
**Version:** 2.0  
**Last Updated:** October 13, 2025

---

## Quick Navigation

- [Payment Method Detection](#payment-method-detection)
- [API Endpoints](#api-endpoints)
- [Common Queries](#common-queries)
- [Debugging Guide](#debugging-guide)
- [Error Codes](#error-codes)

---

## Payment Method Detection

### How Routing Works

```typescript
// Frontend: CheckoutForm.tsx
if (paymentMethod === 'mobile_money') {
  // → PayDunya flow
  // → Redirect to external payment page
  // → Returns via callback URL
} else if (paymentMethod === 'card') {
  // → Stripe flow
  // → In-page card form
  // → No redirect needed
}
```

### Provider Selection Logic

| User Selects | Provider Used | Currency Charged | Redirect? |
|-------------|---------------|------------------|-----------|
| Orange Money | PayDunya | XOF | Yes |
| Wave | PayDunya | XOF | Yes |
| Moov Money | PayDunya | XOF | Yes |
| Credit Card | Stripe | USD | No |
| Debit Card | Stripe | USD | No |

---

## API Endpoints

### Supabase Edge Functions

#### 1. Create PayDunya Payment

**Endpoint:** `POST /functions/v1/create-payment`

**Request:**
```json
{
  "idempotency_key": "payment-1697112000-abc123",
  "user_id": "uuid",
  "event_id": "uuid",
  "order_id": "uuid",
  "ticket_lines": [
    {
      "ticket_type_id": "uuid",
      "quantity": 2,
      "price_major": 2500,
      "currency": "XOF"
    }
  ],
  "amount_major": 5000,
  "currency": "XOF",
  "method": "mobile_money",
  "phone": "+226XXXXXXXX",
  "provider": "orange-money-bf",
  "return_url": "https://temba.com/payment/success",
  "cancel_url": "https://temba.com/payment/cancelled",
  "description": "Event tickets"
}
```

**Response:**
```json
{
  "success": true,
  "payment_url": "https://app.paydunya.com/invoice/xxx",
  "payment_token": "pdnya-token-xxx",
  "payment_id": "uuid"
}
```

#### 2. Create Stripe Payment

**Endpoint:** `POST /functions/v1/create-stripe-payment`

**Simple Mode (Auto-conversion):**
```json
{
  "amount": 5000,
  "currency": "XOF",
  "amount_is_minor": true,
  "event_id": "uuid",
  "order_id": "uuid",
  "user_id": "uuid",
  "description": "Event tickets"
}
```

**Advanced Mode (Pre-calculated FX):**
```json
{
  "display_amount_minor": 5000,
  "display_currency": "XOF",
  "charge_amount_minor": 886,
  "charge_currency": "USD",
  "fx_num": 100,
  "fx_den": 564,
  "fx_locked_at": "2025-10-13T10:30:00Z",
  "fx_margin_bps": 150,
  "event_id": "uuid",
  "order_id": "uuid",
  "user_id": "uuid",
  "idempotencyKey": "stripe-1697112000-abc123"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentId": "uuid",
  "paymentToken": "stripe-token-xxx",
  "orderId": "uuid",
  "status": "requires_payment_method",
  "display_amount": "5 000 XOF",
  "charge_amount": "$8.86 USD",
  "fx_rate": "564.00"
}
```

#### 3. Get FX Quote

**Endpoint:** `POST /functions/v1/fx-quote`

**Request:**
```json
{
  "xof_amount_minor": 5000,
  "margin_bps": 150
}
```

**Response:**
```json
{
  "usd_cents": 886,
  "fx_num": 100,
  "fx_den": 574,
  "fx_locked_at": "2025-10-13T10:30:00Z",
  "margin_bps": 150,
  "base_xof_per_usd": 566,
  "effective_xof_per_usd": 574,
  "display_amount": "5 000 FCFA",
  "charge_amount": "$8.86 USD"
}
```

#### 4. Verify Payment

**Endpoint:** `POST /functions/v1/verify-payment`

**Request (Stripe):**
```json
{
  "payment_token": "stripe-token-xxx",
  "order_id": "uuid"
}
```

**Request (PayDunya):**
```json
{
  "payment_token": "pdnya-token-xxx",
  "order_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "state": "succeeded",
  "payment_id": "uuid",
  "order_id": "uuid",
  "provider": "stripe",
  "message": "Payment verified successfully"
}
```

#### 5. Webhooks

**Stripe Webhook:** `POST /functions/v1/stripe-webhook`
- Validates signature using `STRIPE_WEBHOOK_SECRET`
- Handles: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Creates tickets automatically

**PayDunya IPN:** `POST /functions/v1/paydunya-ipn`
- Validates IP whitelist
- Calls `admin_finalize_payment()` to create tickets

---

## Common Queries

### Check Payment Status

```sql
SELECT 
  id,
  provider,
  status,
  display_amount_minor || ' ' || display_currency AS amount_shown,
  CASE 
    WHEN charge_amount_minor IS NOT NULL 
    THEN charge_amount_minor / 100.0 || ' ' || charge_currency 
    ELSE NULL 
  END AS amount_charged,
  created_at,
  completed_at
FROM payments
WHERE id = 'your-payment-id';
```

### Find Payments for Order

```sql
SELECT 
  p.id,
  p.provider,
  p.status,
  p.amount,
  p.currency,
  p.created_at
FROM payments p
WHERE p.order_id = 'your-order-id'
ORDER BY p.created_at DESC;
```

### Check Tickets for Order

```sql
SELECT 
  t.id,
  t.ticket_type_id,
  t.status,
  t.payment_status,
  t.created_at
FROM tickets t
WHERE t.order_id = 'your-order-id'
ORDER BY t.created_at;
```

### Get Unprocessed Webhooks

```sql
SELECT 
  id,
  provider,
  event_type,
  created_at,
  NOW() - created_at AS age
FROM payment_webhooks
WHERE processed = false
ORDER BY created_at DESC
LIMIT 10;
```

### Payment Success Rate

```sql
SELECT 
  provider,
  DATE(created_at) AS date,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 
    2
  ) AS success_rate_pct
FROM payments
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, DATE(created_at)
ORDER BY date DESC, provider;
```

### Active FX Rate

```sql
SELECT 
  from_currency,
  to_currency,
  rate_decimal,
  source,
  valid_from,
  NOW() - valid_from AS age
FROM fx_rates
WHERE is_active = true
  AND from_currency = 'USD'
  AND to_currency = 'XOF'
ORDER BY valid_from DESC
LIMIT 1;
```

### Stuck Payments

```sql
SELECT 
  id,
  provider,
  status,
  amount,
  currency,
  created_at,
  NOW() - created_at AS pending_duration
FROM payments
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;
```

---

## Debugging Guide

### Problem: Payment Created But No Tickets

**Steps:**

1. **Check payment status:**
```sql
SELECT id, status, order_id, completed_at 
FROM payments 
WHERE id = 'payment-id';
```

2. **Check if order exists:**
```sql
SELECT id, status, ticket_quantities 
FROM orders 
WHERE id = 'order-id';
```

3. **Check if tickets were created:**
```sql
SELECT COUNT(*) AS ticket_count 
FROM tickets 
WHERE order_id = 'order-id';
```

4. **Manually trigger ticket creation:**
```sql
SELECT admin_finalize_payment('payment-id');
```

### Problem: Webhook Not Processing

**Steps:**

1. **Check webhook logs:**
```sql
SELECT * FROM payment_webhooks 
WHERE processed = false 
ORDER BY created_at DESC 
LIMIT 5;
```

2. **Check for duplicate webhooks:**
```sql
SELECT event_key, COUNT(*) AS occurrences
FROM payment_webhooks
WHERE provider = 'stripe'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_key
HAVING COUNT(*) > 1;
```

3. **Check webhook error messages:**
```sql
SELECT event_key, error_message, created_at
FROM payment_webhooks
WHERE processed = false
  AND error_message IS NOT NULL
ORDER BY created_at DESC;
```

4. **Manually reprocess webhook:**
- Copy `raw_payload` from webhook log
- Call appropriate webhook handler with payload

### Problem: FX Rate Not Updating

**Steps:**

1. **Check current rate age:**
```sql
SELECT 
  rate_decimal,
  source,
  valid_from,
  NOW() - valid_from AS age,
  is_active
FROM fx_rates
WHERE from_currency = 'USD' AND to_currency = 'XOF'
ORDER BY valid_from DESC
LIMIT 1;
```

2. **Manually fetch rate:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-fx-rates \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

3. **Check function logs:**
```bash
supabase functions logs fetch-fx-rates --limit 50
```

### Problem: Stripe Payment Failing

**Steps:**

1. **Check Stripe Dashboard** → Payments → Find payment
2. **Look at failure reason** in Stripe Dashboard
3. **Check payment record:**
```sql
SELECT 
  id,
  stripe_payment_intent_id,
  status,
  metadata->>'failure_code' AS failure_code,
  metadata->>'failure_message' AS failure_message
FROM payments
WHERE id = 'payment-id';
```

4. **Check webhook received:**
```sql
SELECT * FROM payment_webhooks
WHERE provider = 'stripe'
  AND raw_payload->>'data'->>'object'->>'id' = 'pi_xxx'
ORDER BY created_at DESC;
```

### Problem: PayDunya Payment Stuck

**Steps:**

1. **Check PayDunya Dashboard** → Transactions
2. **Verify IPN received:**
```sql
SELECT * FROM payment_webhooks
WHERE provider = 'paydunya'
  AND raw_payload->>'invoice'->>'token' = 'paydunya-token'
ORDER BY created_at DESC;
```

3. **Check payment status:**
```sql
SELECT 
  id,
  transaction_id,
  status,
  created_at,
  completed_at
FROM payments
WHERE transaction_id = 'paydunya-token';
```

4. **Manually complete if verified:**
```sql
UPDATE payments 
SET status = 'completed', completed_at = NOW() 
WHERE id = 'payment-id';

SELECT admin_finalize_payment('payment-id');
```

---

## Error Codes

### Stripe Errors

| Code | Meaning | Action |
|------|---------|--------|
| `card_declined` | Card declined by bank | Ask user to try different card |
| `insufficient_funds` | Not enough balance | Ask user to try different card |
| `authentication_required` | 3DS failed | Ensure 3DS flow completes |
| `payment_intent_authentication_failure` | User cancelled 3DS | User needs to retry |
| `invalid_request_error` | Bad request to Stripe | Check logs, fix parameters |

### PayDunya Errors

| Status | Meaning | Action |
|--------|---------|--------|
| `pending` | Payment initiated | Wait for user to complete |
| `completed` | Payment successful | Tickets should be generated |
| `failed` | Payment failed | Show error to user |
| `cancelled` | User cancelled | Allow user to retry |

### Backend Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `Missing required field: event_id` | Invalid request | Check request body |
| `Payment not found` | Invalid payment ID | Verify payment ID |
| `Order not found` | Invalid order ID | Verify order ID |
| `FX source out of bounds` | Invalid FX rate | Check FX rate source |
| `Invalid signature` | Webhook verification failed | Check webhook secret |
| `Failed to create payment record` | Database error | Check database logs |

---

## Environment Variables

### Frontend (.env)

```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# PayDunya
VITE_PAYDUNYA_MODE=live
```

### Backend (Supabase Secrets)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayDunya
PAYDUNYA_MASTER_KEY=xxx
PAYDUNYA_PRIVATE_KEY=xxx
PAYDUNYA_PUBLIC_KEY=xxx
PAYDUNYA_TOKEN=xxx
PAYDUNYA_MODE=live

# Supabase (auto-injected)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### Set Secrets

```bash
# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# List all secrets
supabase secrets list
```

---

## Testing Commands

### Test Stripe Payment (cURL)

```bash
# Get FX quote
curl -X POST https://your-project.supabase.co/functions/v1/fx-quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"xof_amount_minor": 5000, "margin_bps": 150}'

# Create payment
curl -X POST https://your-project.supabase.co/functions/v1/create-stripe-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "amount": 5000,
    "currency": "XOF",
    "amount_is_minor": true,
    "event_id": "your-event-id",
    "description": "Test payment"
  }'
```

### Test Webhook Locally

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

### View Function Logs

```bash
# Stripe payment creation
supabase functions logs create-stripe-payment --limit 50

# Stripe webhook
supabase functions logs stripe-webhook --limit 50

# PayDunya IPN
supabase functions logs paydunya-ipn --limit 50

# FX quote
supabase functions logs fx-quote --limit 20

# Follow logs in real-time
supabase functions logs stripe-webhook --follow
```

---

## Quick Tips

### 💡 Always Use Idempotency Keys

```typescript
// Generate unique key per payment attempt
const idempotencyKey = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 💡 Store Both Amounts for Stripe

```typescript
// Always track display and charge amounts
{
  display_amount_minor: 5000,    // What user sees (XOF)
  display_currency: 'XOF',
  charge_amount_minor: 886,      // What card is charged (USD cents)
  charge_currency: 'USD'
}
```

### 💡 Check Payment Status Before Actions

```sql
-- Never assume status, always check
SELECT status FROM payments WHERE id = 'payment-id';

-- Only act on terminal states
WHERE status IN ('completed', 'failed', 'cancelled')
```

### 💡 Use admin_finalize_payment() for Ticket Creation

```sql
-- Safe to call multiple times
SELECT admin_finalize_payment('payment-id');

-- Returns summary with ticket counts
```

### 💡 Monitor FX Rate Freshness

```sql
-- Alert if rate older than 2 hours
SELECT 
  NOW() - valid_from AS age
FROM fx_rates
WHERE is_active = true
  AND from_currency = 'USD'
  AND to_currency = 'XOF'
HAVING NOW() - valid_from > INTERVAL '2 hours';
```

---

## Support Resources

### Documentation
- **Full Architecture**: `HYBRID-PAYMENT-ARCHITECTURE.md`
- **Implementation Plan**: `HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md`
- **Quick Start**: `HYBRID-PAYMENT-QUICKSTART.md`

### External Docs
- **Stripe API**: https://stripe.com/docs/api
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **PayDunya API**: https://paydunya.com/developers
- **Supabase Functions**: https://supabase.com/docs/guides/functions

### Dashboards
- **Stripe**: https://dashboard.stripe.com
- **PayDunya**: https://app.paydunya.com
- **Supabase**: https://app.supabase.com/project/YOUR_PROJECT

---

*Last Updated: October 13, 2025*

