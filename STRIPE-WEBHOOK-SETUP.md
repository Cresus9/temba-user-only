# 🔔 Stripe Webhook Setup Guide

**Issue:** Payments succeed in Stripe but status doesn't update in database  
**Cause:** Stripe webhook not configured  
**Impact:** Users see "payment pending" instead of success

---

## 🚨 **CRITICAL: Configure Stripe Webhook**

Without this, payments will process but tickets won't be created!

### **Step 1: Get Webhook Endpoint URL**

```
https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/stripe-webhook
```

---

### **Step 2: Add Webhook in Stripe Dashboard**

1. **Go to Stripe Dashboard:**  
   https://dashboard.stripe.com/webhooks

2. **Click "Add endpoint"**

3. **Enter Endpoint URL:**
   ```
   https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/stripe-webhook
   ```

4. **Select Events to Listen:**
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

5. **Click "Add endpoint"**

6. **Copy the Webhook Signing Secret:**
   - Will look like: `whsec_...`
   - Keep this for Step 3

---

### **Step 3: Add Webhook Secret to Supabase**

1. **Go to Supabase Dashboard:**  
   https://supabase.com/dashboard/project/uwmlagvsivxqocklxbbo/settings/functions

2. **Click "Edge Functions"**

3. **Click "Secrets"**

4. **Add new secret:**
   ```
   Key:   STRIPE_WEBHOOK_SECRET
   Value: whsec_... (from Stripe)
   ```

5. **Save**

---

### **Step 4: Redeploy stripe-webhook Function**

```bash
cd /Users/thierryyabre/Downloads/temba-user-only
supabase functions deploy stripe-webhook
```

Or if you don't have Supabase CLI locally, the function will pick up the secret on next invocation.

---

## ✅ **How to Verify It's Working**

### **Test the Webhook**

1. **Make a test payment** on your site
2. **Go to Stripe Dashboard → Webhooks**
3. **Click on your webhook**
4. **Check "Events" tab:**
   - Should show `payment_intent.succeeded`
   - Status should be "200 OK" (green checkmark)
   - If it says "Failed" or "500", check Supabase logs

### **Check Supabase Logs**

1. **Go to:** https://supabase.com/dashboard/project/uwmlagvsivxqocklxbbo/logs/edge-functions
2. **Filter by:** `stripe-webhook`
3. **Look for:**
   - "✅ Payment completed: ..."
   - "✅ Created X tickets for order ..."
4. **If you see errors,** check the full log message

---

## 🔧 **Current Issue: 400 Error**

The 400 error you're seeing is likely because:

1. **Webhook hasn't fired yet** (not configured)
2. **Payment is stuck in "pending" status**
3. **verify-payment function** can't find a completed payment

**Once webhook is configured:**
- ✅ Webhook fires when payment succeeds
- ✅ Updates payment status to "completed"
- ✅ Creates tickets automatically
- ✅ verify-payment returns success
- ✅ User sees confirmation page with tickets

---

## 🎯 **Required Supabase Edge Function Secrets**

Make sure these are ALL set:

| Secret Name | Purpose | Status |
|------------|---------|--------|
| `STRIPE_SECRET_KEY` | Create payments | ✅ Should be set |
| `STRIPE_WEBHOOK_SECRET` | Verify webhooks | ❌ **ADD THIS NOW** |
| `SUPABASE_URL` | Database access | ✅ Should be set |
| `SUPABASE_SERVICE_ROLE_KEY` | Database writes | ✅ Should be set |

---

## 📝 **Test Flow After Setup**

### **Without Webhook (Current State):**
1. User enters card → ✅ Works
2. Stripe charges card → ✅ Works  
3. Webhook fires → ❌ Not configured
4. Payment stays "pending" → ❌ Problem
5. Tickets not created → ❌ Problem
6. User sees error → ❌ Problem

### **With Webhook (After Setup):**
1. User enters card → ✅ Works
2. Stripe charges card → ✅ Works
3. Webhook fires → ✅ Works
4. Payment marked "completed" → ✅ Works
5. Tickets created → ✅ Works
6. User sees success → ✅ Works

---

## 🚀 **Quick Setup (5 minutes)**

1. **Add webhook in Stripe** (2 min)
2. **Copy signing secret** (30 sec)
3. **Add secret to Supabase** (1 min)
4. **Test with real payment** (1 min)
5. **Verify webhook delivered** (30 sec)

---

## 🐛 **Troubleshooting**

### **Webhook shows "Failed" in Stripe:**
- Check Supabase Edge Function logs
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure function is deployed

### **Payment stuck in "pending":**
- Webhook hasn't fired or failed
- Check Stripe webhook logs
- Manually trigger webhook from Stripe Dashboard

### **Tickets not created:**
- Check Supabase logs for errors
- Verify `order_id` is linked to payment
- Check `tickets` table for records

---

## 🎉 **Success Indicators**

✅ Stripe webhook shows "200 OK"  
✅ Payment status changes to "completed"  
✅ Tickets appear in database  
✅ User sees confirmation page  
✅ No 400 errors in console  

---

**🎯 Next: Configure the Stripe webhook NOW to make payments fully functional!**

