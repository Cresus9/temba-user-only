# 🚀 Production Rollout Checklist - Stripe Card Payments

**Status:** Ready for Production  
**Payment Methods:** Card Only (Mobile Money temporarily disabled)  
**Date:** October 11, 2025

---

## ✅ Pre-Deployment Checklist

### 1. **Stripe Configuration**

- [ ] **Live API Keys Configured**
  - [ ] `STRIPE_SECRET_KEY` set in Supabase Edge Functions secrets
  - [ ] Live publishable key in `.env`: `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
  - [ ] Verify keys are LIVE (not test) keys

- [ ] **Webhook Endpoint Configured in Stripe Dashboard**
  - [ ] Go to: https://dashboard.stripe.com/webhooks
  - [ ] Add endpoint: `https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/stripe-webhook`
  - [ ] Select events:
    - [x] `payment_intent.succeeded`
    - [x] `payment_intent.payment_failed`
  - [ ] Copy webhook signing secret
  - [ ] Add `STRIPE_WEBHOOK_SECRET` to Supabase secrets

- [ ] **Test Webhook Delivery**
  - [ ] Send test webhook from Stripe Dashboard
  - [ ] Verify it appears in Supabase Edge Function logs
  - [ ] Check that signature verification works

---

### 2. **Database Migrations**

- [ ] **Verify All Migrations Applied**
  ```sql
  -- Run in Supabase Dashboard
  SELECT * FROM supabase_migrations.schema_migrations 
  ORDER BY version DESC LIMIT 10;
  ```
  
  Expected migrations:
  - [x] `20250313000001_create_payment_system.sql` - Base payment tables
  - [x] `20251011_add_fx_tracking.sql` - FX currency tracking
  - [x] `20251011_create_fx_rates_table.sql` - Real-time FX rates
  - [x] `20251011000002_ensure_order_id_column.sql` - Order ID column

- [ ] **Verify Critical Columns Exist**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'payments' 
  AND column_name IN ('order_id', 'provider', 'stripe_payment_intent_id', 
                      'display_currency', 'charge_currency', 'fx_rate_numerator');
  ```

---

### 3. **Environment Variables**

#### **Frontend (.env or .env.production)**
```bash
VITE_SUPABASE_URL=https://uwmlagvsivxqocklxbbo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51PooB5AYM8AElYkr... # LIVE KEY
```

#### **Supabase Edge Functions (Set in Supabase Dashboard → Edge Functions → Secrets)**
```bash
STRIPE_SECRET_KEY=sk_live_... # LIVE KEY
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe webhook config
SUPABASE_URL=https://uwmlagvsivxqocklxbbo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] All environment variables set
- [ ] No test keys in production
- [ ] Secrets stored securely (not in code)

---

### 4. **Supabase Edge Functions Deployment**

Deploy all required functions:

```bash
# Deploy FX quote function
supabase functions deploy fx-quote

# Deploy FX rates fetcher (if using real-time rates)
supabase functions deploy fetch-fx-rates

# Deploy Stripe payment creation
supabase functions deploy create-stripe-payment

# Deploy Stripe webhook handler
supabase functions deploy stripe-webhook

# Deploy payment verification
supabase functions deploy verify-payment
```

- [ ] All functions deployed
- [ ] Check deployment logs for errors
- [ ] Test each function with curl (see test commands below)

---

### 5. **Frontend Deployment**

- [ ] **Build for Production**
  ```bash
  npm run build
  ```

- [ ] **Check Build Output**
  - [ ] No errors in build
  - [ ] Environment variables injected correctly
  - [ ] Stripe publishable key is LIVE key

- [ ] **Deploy to Netlify/Vercel/etc.**
  - [ ] Deploy command: `npm run build` or equivalent
  - [ ] Environment variables configured in hosting dashboard
  - [ ] CORS headers configured if needed

- [ ] **Verify Deployment**
  - [ ] Site accessible at production URL
  - [ ] No console errors on load
  - [ ] Stripe Elements loads correctly

---

### 6. **Security Checks**

- [ ] **RLS (Row Level Security) Enabled**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('payments', 'orders', 'tickets');
  ```
  All should show `rowsecurity = true`

- [ ] **API Keys Secured**
  - [ ] No secret keys in frontend code
  - [ ] No keys in git history
  - [ ] Environment variables not exposed in browser

- [ ] **Webhook Signature Verification**
  - [ ] Verify `stripe-webhook` function checks signatures
  - [ ] Test with invalid signature (should fail)

---

## 🧪 Production Testing Checklist

### **Test 1: FX Quote Function**

```bash
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/fx-quote' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"xof_amount_minor": 25000}'
```

**Expected:** JSON with `usd_cents`, `fx_num`, `fx_den`, etc.

- [ ] Returns valid FX quote
- [ ] Rate is reasonable (around 560-580 XOF per USD)
- [ ] No errors in logs

---

### **Test 2: Create Stripe Payment**

```bash
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-stripe-payment' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "display_amount_minor": 25000,
    "display_currency": "XOF",
    "charge_amount_minor": 4500,
    "charge_currency": "USD",
    "fx_num": 100,
    "fx_den": 566,
    "fx_locked_at": "2025-10-11T12:00:00.000Z",
    "fx_margin_bps": 150,
    "event_id": "YOUR_EVENT_ID",
    "user_id": "YOUR_USER_ID",
    "order_id": "YOUR_ORDER_ID",
    "description": "Production test",
    "idempotencyKey": "prod-test-key-1"
  }'
```

**Expected:** JSON with `clientSecret`, `paymentId`, `orderId`

- [ ] Returns client secret
- [ ] Payment record created in database
- [ ] Shows up in Stripe Dashboard

---

### **Test 3: Full End-to-End Payment**

1. **Select Event & Tickets**
   - [ ] Navigate to an event
   - [ ] Add tickets to cart
   - [ ] Proceed to checkout

2. **Checkout Page**
   - [ ] Only card payment option visible
   - [ ] Message shows: "Les paiements Mobile Money seront bientôt disponibles"
   - [ ] FX quote loads automatically
   - [ ] Displays both XOF and USD amounts

3. **Enter Card Details** (Use test card in test mode, real card in production)
   - Test card: `4242 4242 4242 4242`, Exp: `12/25`, CVC: `123`
   - [ ] Stripe Elements loads
   - [ ] Card input works
   - [ ] No console errors

4. **Submit Payment**
   - [ ] "Payer avec la carte" button works
   - [ ] Loading state shows
   - [ ] Payment processes in Stripe

5. **Webhook Processing**
   - [ ] Webhook received (check Stripe Dashboard → Webhooks)
   - [ ] Payment status updated to "completed"
   - [ ] Order status updated to "COMPLETED"
   - [ ] Tickets created automatically

6. **Success Page**
   - [ ] Redirects to `/payment/success`
   - [ ] Shows order confirmation
   - [ ] Displays ticket(s)
   - [ ] QR codes generated
   - [ ] Download/email options work

---

## 📊 Monitoring Setup

### **1. Stripe Dashboard Monitoring**

- [ ] Set up email notifications for failed payments
- [ ] Monitor payment success rate
- [ ] Check for chargebacks/disputes
- [ ] Review webhook delivery logs

### **2. Supabase Logs**

- [ ] Monitor Edge Function logs
- [ ] Set up alerts for errors
- [ ] Track function invocations
- [ ] Monitor database performance

### **3. Application Monitoring**

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor frontend console errors
- [ ] Track payment conversion rates
- [ ] Monitor page load times

---

## 🔄 Rollback Plan

If issues arise, follow these steps:

### **Quick Rollback**

1. **Revert Frontend Deployment**
   ```bash
   # Rollback to previous deployment
   netlify rollback  # or equivalent for your host
   ```

2. **Disable Stripe Payments**
   - Comment out card payment option in `CheckoutForm.tsx`
   - Re-enable mobile money (uncomment code)
   - Redeploy

3. **Disable Webhook**
   - Go to Stripe Dashboard → Webhooks
   - Disable the webhook endpoint
   - This prevents any automatic processing

### **Emergency Contact**

- **Stripe Support:** https://support.stripe.com
- **Supabase Support:** https://supabase.com/dashboard/support

---

## 📝 Post-Deployment Tasks

### **Immediate (Within 1 Hour)**

- [ ] Monitor first 10 transactions
- [ ] Check webhook delivery rate (should be 100%)
- [ ] Verify tickets are being created
- [ ] Check for any errors in logs

### **First 24 Hours**

- [ ] Review all transactions
- [ ] Check customer support tickets
- [ ] Monitor payment success rate
- [ ] Verify FX rates are accurate

### **First Week**

- [ ] Analyze payment conversion funnel
- [ ] Review any failed payments
- [ ] Collect user feedback
- [ ] Optimize checkout flow if needed

---

## 🎯 Success Criteria

✅ **Payment Processing**
- Payment success rate > 95%
- Webhook delivery rate = 100%
- Average payment time < 10 seconds

✅ **User Experience**
- Checkout completion rate > 70%
- No critical bugs reported
- Positive user feedback

✅ **Technical**
- No production errors
- All webhooks processed
- Database performance stable

---

## 🔮 Future Enhancements (After PayDunya Verification)

1. **Re-enable Mobile Money**
   - Uncomment mobile money code in `CheckoutForm.tsx`
   - Update info message
   - Redeploy

2. **Add Payment Method Icons**
   - Display supported card brands
   - Show mobile money provider logos

3. **Optimize Checkout Flow**
   - Add saved payment methods
   - Implement one-click checkout
   - Add payment method switching

---

## 📞 Support Information

**Technical Issues:**
- Check Supabase logs first
- Review Stripe Dashboard webhooks
- Check browser console for frontend errors

**Payment Issues:**
- Verify webhook was received
- Check payment status in database
- Look up transaction in Stripe Dashboard

**Customer Support:**
- Provide payment ID and order ID
- Check payment status in database
- Verify ticket creation

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Test payment successful
- [ ] Monitoring in place
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Ready for production traffic

**Deployed By:** _______________  
**Date:** _______________  
**Time:** _______________  

---

🎉 **Ready to launch!** Remember: Mobile Money will be available once PayDunya verification is complete. Simply uncomment the code and redeploy.


