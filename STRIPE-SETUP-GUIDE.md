# Stripe Setup Guide for Temba
## Step-by-Step Configuration Instructions

---

## Prerequisites

- [ ] Access to Stripe account (create at https://stripe.com)
- [ ] Access to Supabase project
- [ ] Access to production domain
- [ ] Admin access to deploy functions

---

## Part 1: Stripe Account Setup

### 1.1 Create Stripe Account

1. Go to https://stripe.com/register
2. Fill in business details:
   - **Business name:** Temba
   - **Business type:** E-commerce / Ticketing
   - **Country:** Burkina Faso (or your primary market)
   - **Currency:** XOF (West African CFA franc)
3. Verify email address
4. Complete identity verification

### 1.2 Activate Account

1. Submit required documents:
   - Business registration
   - Tax ID
   - Bank account details
2. Wait for approval (usually 1-3 business days)
3. Enable live payments

### 1.3 Configure Payment Methods

1. Go to **Settings** → **Payment methods**
2. Enable:
   - ✅ Visa
   - ✅ Mastercard
   - ✅ American Express
   - ✅ Discover (optional)
3. Configure 3D Secure (SCA):
   - Enable for all European cards
   - Optional for other regions

### 1.4 Get API Keys

**Test Mode Keys:**
1. Switch to **Test mode** (toggle at top)
2. Go to **Developers** → **API keys**
3. Copy:
   - **Publishable key:** `pk_test_...`
   - **Secret key:** `sk_test_...` (click "Reveal test key")

**Live Mode Keys:**
1. Switch to **Live mode**
2. Go to **Developers** → **API keys**
3. Copy:
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...` (click "Reveal live key")

⚠️ **Security Note:** Never commit secret keys to version control!

---

## Part 2: Webhook Configuration

### 2.1 Create Test Webhook Endpoint

1. Go to **Developers** → **Webhooks** (Test mode)
2. Click **Add endpoint**
3. Enter endpoint URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.refunded`
   - ✅ `charge.dispute.created`
5. Click **Add endpoint**
6. Copy **Signing secret:** `whsec_...`

### 2.2 Create Live Webhook Endpoint

1. Switch to **Live mode**
2. Repeat steps above with production URL
3. Save live webhook secret

### 2.3 Test Webhook

```bash
# Test webhook locally using Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

## Part 3: Environment Configuration

### 3.1 Frontend Environment Variables

Create or update `.env` file:

```bash
# Stripe - Test Mode
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
VITE_STRIPE_TEST_MODE=true

# Stripe - Live Mode (for production)
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_51ABC...

# PayDunya (existing)
VITE_PAYDUNYA_MODE=live
```

### 3.2 Backend Secrets (Supabase)

Set secrets using Supabase CLI:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set Test Mode Secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_51ABC...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_ABC...

# Set Live Mode Secrets (for production)
supabase secrets set STRIPE_LIVE_SECRET_KEY=sk_live_51ABC...
supabase secrets set STRIPE_LIVE_WEBHOOK_SECRET=whsec_XYZ...

# Verify secrets are set
supabase secrets list
```

**Expected output:**
```
NAME                          VALUE
STRIPE_SECRET_KEY            sk_test_51ABC... (hidden)
STRIPE_WEBHOOK_SECRET        whsec_ABC... (hidden)
STRIPE_LIVE_SECRET_KEY       sk_live_51ABC... (hidden)
STRIPE_LIVE_WEBHOOK_SECRET   whsec_XYZ... (hidden)
```

---

## Part 4: Install Dependencies

### 4.1 Frontend Dependencies

```bash
cd /Users/thierryyabre/Downloads/temba-user-only

# Install Stripe React libraries
npm install @stripe/stripe-js @stripe/react-stripe-js

# Verify installation
npm list @stripe/stripe-js @stripe/react-stripe-js
```

### 4.2 Backend Dependencies

No installation needed! Stripe API is accessed via fetch in Deno.

---

## Part 5: Database Migration

### 5.1 Run Migration Script

```bash
# Connect to your database
psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Run migration
\i STRIPE-MIGRATION-SQL.sql

# Verify tables updated
\d payments
\d payment_webhooks
\d payment_methods

# Check views created
\dv
```

### 5.2 Verify Migration

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('provider', 'stripe_payment_intent_id', 'card_last4');

-- Should return 3 rows
```

---

## Part 6: Deploy Backend Functions

### 6.1 Create Stripe Functions

Create these new function files (templates provided in plan):

1. `supabase/functions/create-stripe-payment/index.ts`
2. `supabase/functions/stripe-webhook/index.ts`

### 6.2 Deploy Functions

```bash
# Deploy new Stripe functions
supabase functions deploy create-stripe-payment
supabase functions deploy stripe-webhook

# Verify deployment
supabase functions list
```

**Expected output:**
```
NAME                      STATUS    REGION
create-stripe-payment     active    us-east-1
stripe-webhook            active    us-east-1
create-payment            active    us-east-1  (existing)
verify-payment            active    us-east-1  (existing)
paydunya-ipn              active    us-east-1  (existing)
```

### 6.3 Test Functions

```bash
# Test create-stripe-payment
curl -X POST \
  'https://your-project-ref.supabase.co/functions/v1/create-stripe-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount_major": 5000,
    "currency": "xof",
    "event_id": "test-event-id",
    "buyer_email": "test@example.com"
  }'

# Should return:
# {"success": true, "client_secret": "pi_xxx_secret_xxx"}
```

---

## Part 7: Frontend Integration

### 7.1 Wrap App with Stripe Provider

Update `src/main.tsx`:

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

root.render(
  <Elements stripe={stripePromise}>
    <App />
  </Elements>
);
```

### 7.2 Update Checkout Components

The checkout form will automatically detect and use Stripe for card payments.

---

## Part 8: Testing

### 8.1 Test Cards

Use Stripe test cards:

| Card Number         | Description              | Behavior           |
|---------------------|--------------------------|-------------------|
| 4242 4242 4242 4242 | Visa                     | Success           |
| 4000 0025 0000 3155 | Visa (3DS Required)      | 3DS auth required |
| 4000 0000 0000 0002 | Generic decline          | Card declined     |
| 4000 0000 0000 9995 | Insufficient funds       | Declined          |
| 5555 5555 5555 4444 | Mastercard               | Success           |
| 3782 822463 10005   | American Express         | Success           |

**Test Details:**
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVV (e.g., 123)
- Any billing postal code

### 8.2 Test Flow

1. **Test Card Payment:**
   - Go to checkout page
   - Select "Card" payment method
   - Enter test card: 4242 4242 4242 4242
   - Complete payment
   - Verify success page
   - Check tickets generated

2. **Test 3D Secure:**
   - Use card: 4000 0025 0000 3155
   - Complete 3DS challenge
   - Verify payment succeeds

3. **Test Declined Card:**
   - Use card: 4000 0000 0000 0002
   - Verify error message shown
   - Verify no charge created

### 8.3 Test Webhooks

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# In another terminal, trigger test
stripe trigger payment_intent.succeeded

# Check logs for webhook received
```

---

## Part 9: Security Checklist

- [ ] API keys stored in environment variables (not code)
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured
- [ ] CORS configured properly
- [ ] Database RLS policies active
- [ ] Sensitive data encrypted
- [ ] PCI compliance verified (using Stripe Elements)
- [ ] 3D Secure enabled for European cards
- [ ] Error logging configured
- [ ] Monitoring alerts set up

---

## Part 10: Go Live Checklist

### Before Production

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Load testing done
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Support team trained

### Production Deployment

1. **Switch to Live Mode:**
   ```bash
   # Update environment variables to live keys
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   VITE_STRIPE_TEST_MODE=false
   
   # Update Supabase secrets
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live...
   ```

2. **Deploy:**
   ```bash
   # Deploy frontend
   npm run build
   # Deploy to Netlify/Vercel
   
   # Deploy functions
   supabase functions deploy create-stripe-payment
   supabase functions deploy stripe-webhook
   ```

3. **Verify:**
   - Test one real payment (small amount)
   - Check webhook received
   - Verify tickets generated
   - Check email sent
   - Monitor logs for errors

### Post-Launch

- [ ] Monitor payment success rate
- [ ] Watch for webhook failures
- [ ] Check error logs daily
- [ ] Review customer feedback
- [ ] Track conversion metrics

---

## Part 11: Monitoring & Alerts

### Stripe Dashboard

Monitor these metrics:

1. **Payments** → View all transactions
2. **Disputes** → Handle chargebacks
3. **Logs** → API request logs
4. **Webhooks** → Webhook delivery status

### Set Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable email alerts for:
   - Failed payments
   - Disputes
   - Unusual activity
   - Webhook failures

### Supabase Monitoring

```sql
-- Check payment success rate
SELECT 
  provider,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
    COUNT(*) * 100, 
    2
  ) as success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;

-- Check recent webhook events
SELECT * FROM recent_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

---

## Part 12: Troubleshooting

### Common Issues

**Issue: "Invalid API key"**
```
Solution: Verify you're using the correct key for the environment
- Test mode: pk_test_... and sk_test_...
- Live mode: pk_live_... and sk_live_...
```

**Issue: "Webhook signature verification failed"**
```
Solution: Verify webhook secret matches
1. Go to Stripe Dashboard → Webhooks
2. Click your endpoint
3. Copy signing secret
4. Update: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Issue: "Card declined"**
```
Solution: Common reasons:
- Insufficient funds
- Incorrect card details
- Card requires 3D Secure
- Bank blocking international transaction

Ask user to:
1. Try a different card
2. Contact their bank
3. Verify card details
```

**Issue: "Payment stuck in pending"**
```
Solution:
1. Check Stripe dashboard for payment status
2. Verify webhook was received
3. Check payment_webhooks table for errors
4. Manually trigger webhook event in Stripe dashboard
```

### Debug Mode

Enable detailed logging:

```typescript
// In your frontend code
if (import.meta.env.DEV) {
  console.log('Stripe Debug:', {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.slice(0, 20),
    testMode: import.meta.env.VITE_STRIPE_TEST_MODE
  });
}
```

---

## Part 13: Resources

### Documentation
- [Stripe Docs](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Elements](https://stripe.com/docs/stripe-js)
- [Stripe React](https://stripe.com/docs/stripe-js/react)
- [Webhooks Guide](https://stripe.com/docs/webhooks)

### Support
- Stripe Support: https://support.stripe.com
- Stripe Community: https://stripe.com/community
- Status Page: https://status.stripe.com

### Tools
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Tester](https://webhook.site)

---

## Completion Checklist

Mark items as you complete them:

### Setup Phase
- [ ] Stripe account created and verified
- [ ] API keys obtained (test and live)
- [ ] Webhooks configured
- [ ] Environment variables set
- [ ] Dependencies installed

### Development Phase
- [ ] Database migrated
- [ ] Backend functions deployed
- [ ] Frontend integrated
- [ ] Test payments working
- [ ] Webhooks receiving events

### Testing Phase
- [ ] Test card payments successful
- [ ] 3D Secure working
- [ ] Declined cards handled properly
- [ ] Webhooks processed correctly
- [ ] Error handling tested

### Production Phase
- [ ] Live API keys configured
- [ ] Production webhooks set up
- [ ] Security audit passed
- [ ] Monitoring configured
- [ ] Support team trained
- [ ] Go-live completed

---

## Next Steps

After completing this setup:

1. **Test thoroughly** in test mode
2. **Review security** measures
3. **Train support team** on Stripe dashboard
4. **Document any issues** encountered
5. **Plan production deployment**

For questions or issues, refer to the main **HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md** document.

---

*Setup guide last updated: October 11, 2025*

