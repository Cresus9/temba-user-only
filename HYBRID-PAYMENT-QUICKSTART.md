# Hybrid Payment Quick Start Guide
## Get Started in 30 Minutes

---

## Overview

This guide will help you set up the hybrid payment system quickly for testing.

**Payment Providers:**
- 🟠 **PayDunya** → Mobile Money (Orange, Wave, Moov)
- 🔵 **Stripe** → Credit/Debit Cards (Visa, Mastercard, Amex)

**Time to Complete:** ~30 minutes for test mode

---

## Prerequisites

✅ You already have:
- PayDunya account configured
- Supabase project set up
- Frontend running locally

❌ You need:
- Stripe account (free, sign up below)
- 30 minutes of time

---

## Step 1: Create Stripe Account (5 min)

1. Go to https://stripe.com/register
2. Enter your email
3. Verify email
4. Skip business verification for now (test mode works without it)
5. You're in! 🎉

---

## Step 2: Get Stripe API Keys (2 min)

1. In Stripe Dashboard, make sure you're in **Test Mode** (toggle top-right)
2. Go to **Developers** → **API keys**
3. Copy these two keys:
   ```
   Publishable key: pk_test_51...
   Secret key: sk_test_51...
   ```
4. Save them in a secure note (we'll use them next)

---

## Step 3: Configure Stripe Webhook (3 min)

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter URL:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/functions/v1/stripe-webhook
   ```
   Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference

4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Click **Add endpoint**

6. Copy the **Signing secret** (starts with `whsec_`)

---

## Step 4: Install Dependencies (2 min)

```bash
cd /Users/thierryyabre/Downloads/temba-user-only

# Install Stripe libraries
npm install @stripe/stripe-js @stripe/react-stripe-js

# Verify installation
npm list @stripe/stripe-js
```

---

## Step 5: Set Environment Variables (3 min)

### Frontend (.env)

Add to your `.env` file:

```bash
# Stripe Test Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...YOUR_KEY_HERE
VITE_STRIPE_TEST_MODE=true
```

### Backend (Supabase Secrets)

```bash
# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_51...YOUR_KEY_HERE
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...YOUR_WEBHOOK_SECRET

# Verify they're set
supabase secrets list
```

---

## Step 6: Update Database (3 min)

```bash
# Run the migration script
psql [YOUR_DATABASE_URL] -f STRIPE-MIGRATION-SQL.sql

# Or if using Supabase Studio:
# 1. Go to SQL Editor
# 2. Copy contents of STRIPE-MIGRATION-SQL.sql
# 3. Run the query
```

**Verify it worked:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'provider';
-- Should return 1 row
```

---

## Step 7: Create Stripe Payment Function (5 min)

Create file: `supabase/functions/create-stripe-payment/index.ts`

Copy the code from `STRIPE-CODE-TEMPLATES.md` → Section 5

Then deploy:
```bash
supabase functions deploy create-stripe-payment
```

---

## Step 8: Create Stripe Webhook Function (5 min)

Create file: `supabase/functions/stripe-webhook/index.ts`

Copy the code from `STRIPE-CODE-TEMPLATES.md` → Section 6

Then deploy:
```bash
supabase functions deploy stripe-webhook
```

---

## Step 9: Update Frontend (5 min)

### A. Create Stripe Context

Create file: `src/context/StripeContext.tsx`

Copy code from `STRIPE-CODE-TEMPLATES.md` → Section 1

### B. Create Card Input Component

Create file: `src/components/checkout/StripeCardInput.tsx`

Copy code from `STRIPE-CODE-TEMPLATES.md` → Section 2

### C. Wrap App with Stripe Provider

Update `src/main.tsx`:

```typescript
import { StripeProvider } from './context/StripeContext';

// Wrap your app
<StripeProvider>
  <App />
</StripeProvider>
```

---

## Step 10: Test It! (5 min)

### Test Card Payment

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Go to any event and click "Buy Tickets"

3. Select payment method: **Card**

4. Enter test card:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/34
   CVV: 123
   ```

5. Click "Pay"

6. You should see success! 🎉

### Test Mobile Money (Existing)

1. Select payment method: **Mobile Money**
2. Select provider: Orange Money
3. Enter phone: +226 XX XX XX XX
4. Complete payment
5. Success! 🎉

---

## Troubleshooting

### "Stripe not loaded"
**Solution:** Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`

### "Invalid API key"
**Solution:** Make sure you're using **test** keys (start with `pk_test_` and `sk_test_`)

### "Payment failed"
**Solution:** Use test card `4242 4242 4242 4242`

### "Webhook not received"
**Solution:** 
1. Check webhook URL in Stripe dashboard
2. Verify function is deployed: `supabase functions list`
3. Check function logs: `supabase functions logs stripe-webhook`

---

## What's Next?

### For Development

✅ Test more scenarios:
- Declined card: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`
- Different card brands

✅ Improve UI:
- Add payment provider logos
- Better error messages
- Loading states

### For Production

📋 Before going live:
1. Complete full setup (see `STRIPE-SETUP-GUIDE.md`)
2. Switch to live API keys
3. Complete Stripe business verification
4. Security audit
5. Load testing

---

## Quick Reference

### Test Cards

| Card | Purpose | Number |
|------|---------|--------|
| Success | Normal payment | 4242 4242 4242 4242 |
| Decline | Test error handling | 4000 0000 0000 0002 |
| 3D Secure | Test authentication | 4000 0025 0000 3155 |
| Insufficient Funds | Test decline | 4000 0000 0000 9995 |

### Useful Commands

```bash
# View Stripe function logs
supabase functions logs create-stripe-payment

# View webhook logs
supabase functions logs stripe-webhook

# Test webhook locally
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Useful URLs

- Stripe Dashboard: https://dashboard.stripe.com/test/payments
- Stripe Logs: https://dashboard.stripe.com/test/logs
- Stripe Webhooks: https://dashboard.stripe.com/test/webhooks
- Supabase Functions: https://app.supabase.com/project/[PROJECT]/functions

---

## Cost Breakdown

### Development (Test Mode)
- **Stripe:** FREE ✅
- **PayDunya:** FREE (test mode) ✅
- **Total:** $0/month

### Production Estimates

**Scenario:** 1,000 transactions/month, XOF 5,000 average

| Provider | Method | Fee | Cost/Month |
|----------|--------|-----|------------|
| PayDunya | Mobile Money | 2-3% | XOF 100,000 - 150,000 |
| Stripe | Credit Cards | 2.9% + €0.30 | XOF 145,000 - 160,000 |

**Hybrid Approach:**
- 500 mobile money (PayDunya): ~XOF 50,000-75,000
- 500 card payments (Stripe): ~XOF 70,000-80,000
- **Total:** ~XOF 120,000-155,000
- **Savings:** ~20-30% vs single provider

---

## Support & Resources

### Documentation
- 📖 **Full Implementation Plan:** `HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md`
- 🔧 **Setup Guide:** `STRIPE-SETUP-GUIDE.md`
- 💻 **Code Templates:** `STRIPE-CODE-TEMPLATES.md`
- 🗄️ **Database Migration:** `STRIPE-MIGRATION-SQL.sql`

### Help
- Stripe Support: https://support.stripe.com
- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs

---

## Success Checklist

Mark items as you complete them:

- [ ] Stripe account created
- [ ] API keys obtained
- [ ] Webhook configured
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Functions deployed
- [ ] Frontend updated
- [ ] Test card payment successful
- [ ] Test mobile money successful

---

## Next Steps After Quick Start

1. **Review Full Plan**
   - Read `HYBRID-PAYMENT-IMPLEMENTATION-PLAN.md`
   - Understand all components
   - Review security considerations

2. **Test Thoroughly**
   - Test all payment scenarios
   - Test error cases
   - Test on mobile devices

3. **Prepare for Production**
   - Complete Stripe verification
   - Get live API keys
   - Security audit
   - Load testing

4. **Deploy to Production**
   - Follow deployment checklist
   - Monitor closely
   - Have rollback plan ready

---

## Congratulations! 🎉

You now have a hybrid payment system with:
- ✅ PayDunya for mobile money
- ✅ Stripe for credit cards
- ✅ Seamless user experience
- ✅ Lower transaction fees
- ✅ Better global reach

**Questions?** Review the detailed documentation files or reach out for support.

---

*Quick Start Guide v1.0 - Last Updated: October 11, 2025*

