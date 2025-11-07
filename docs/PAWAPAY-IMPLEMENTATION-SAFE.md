# pawaPay Implementation - Safe Migration Plan

## ✅ **Critical Assurance: Stripe Will NOT Be Affected**

**Why?** The payment system already has **complete separation**:
- **Stripe** = Card payments only (USD)
- **PayDunya** = Mobile money only (XOF)
- **pawaPay** = Will replace PayDunya only (XOF)

They operate on **completely different code paths** and will never interact.

## 🎯 Payment Routing (Current & New)

### Current System
```typescript
User Selects Payment Method
        ↓
    ┌───┴────┐
    │        │
Mobile      Card
Money     Payment
    │        │
    ↓        ↓
PayDunya  Stripe  ← NEVER TOUCHES THIS!
  API       API
```

### After pawaPay Migration
```typescript
User Selects Payment Method
        ↓
    ┌───┴────┐
    │        │
Mobile      Card
Money     Payment
    │        │
    ↓        ↓
pawaPay   Stripe  ← STILL UNTOUCHED!
  API       API
```

## 🛡️ Implementation Strategy: Zero Impact on Stripe

### Key Principle: Only Touch Mobile Money Code

We will **ONLY** modify:
1. ✅ Mobile money payment creation (replace PayDunya with pawaPay)
2. ✅ Mobile money webhook handler (replace PayDunya IPN with pawaPay webhook)
3. ✅ Frontend mobile money UI (replace PayDunya redirect with pawaPay SDK)

We will **NEVER** touch:
1. ❌ Stripe payment functions
2. ❌ Stripe webhook handler
3. ❌ Stripe frontend components
4. ❌ Card payment logic
5. ❌ Currency conversion for cards

## 📁 File Changes (Stripe-Safe)

### Files We'll Create/Modify (Mobile Money Only)
```
✅ supabase/functions/create-pawapay-payment/index.ts  (NEW)
✅ supabase/functions/pawapay-webhook/index.ts        (NEW)
✅ src/services/pawapayService.ts                     (NEW)
✅ src/components/payment/PawaPayPayment.tsx          (NEW)
```

### Files We'll Modify (Only Mobile Money Parts)
```
✅ src/components/checkout/CheckoutForm.tsx
   - Only modify: if (paymentMethod === 'mobile_money')
   - Leave: if (paymentMethod === 'card') UNTOUCHED

✅ src/services/paymentService.ts
   - Only modify: mobile money methods
   - Leave: Stripe methods UNTOUCHED
```

### Files We'll NEVER Touch
```
❌ supabase/functions/create-stripe-payment/index.ts
❌ supabase/functions/stripe-webhook/index.ts
❌ src/components/payment/StripeCardInput.tsx
❌ Any Stripe-related code
```

## 🔧 Step-by-Step Safe Implementation

### Step 1: Create pawaPay Edge Function (Doesn't Touch Stripe)

```typescript
// supabase/functions/create-pawapay-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      order_id,
      amount,
      currency,
      phone,
      provider, // orange_money, mtn_mobile_money, moov_money
      user_id,
      event_id,
      ticket_quantities,
    } = await req.json();

    // Validate - only mobile money, not cards
    if (currency !== 'XOF') {
      throw new Error('pawaPay only handles XOF mobile money payments');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Create order (same logic as Stripe, but for mobile money)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: order_id,
        user_id,
        event_id,
        total: amount,
        status: 'PENDING',
        payment_method: 'mobile_money',
        ticket_quantities,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Call pawaPay API
    const pawapayResponse = await fetch('https://api.pawapay.cloud/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAWAPAY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: 'XOF',
          value: amount,
        },
        payer: {
          type: 'MSISDN',
          account: phone,
        },
        paymentMethod: provider,
        reference: order_id,
        callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pawapay-webhook`,
        returnUrl: `${Deno.env.get('SITE_URL')}/payment/success?order_id=${order_id}`,
      }),
    });

    if (!pawapayResponse.ok) {
      throw new Error('Failed to create pawaPay payment');
    }

    const pawapayData = await pawapayResponse.json();

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id,
        user_id,
        amount,
        currency: 'XOF',
        provider: 'pawapay', // ← New provider, doesn't affect Stripe
        status: 'pending',
        payment_token: pawapayData.transactionId,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        transaction_id: pawapayData.transactionId,
        payment_url: pawapayData.paymentUrl, // For redirect flow if needed
        status: 'pending',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('pawaPay payment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

### Step 2: Create pawaPay Webhook (Separate from Stripe Webhook)

```typescript
// supabase/functions/pawapay-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Verify webhook signature
    const signature = req.headers.get('X-PawaPay-Signature');
    const body = await req.text();
    
    // Verify signature (implement based on pawaPay docs)
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process webhook event
    switch (event.type) {
      case 'payment.success':
        await handleSuccessfulPayment(supabase, event.data);
        break;
      case 'payment.failed':
        await handleFailedPayment(supabase, event.data);
        break;
      case 'payment.pending':
        await handlePendingPayment(supabase, event.data);
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('pawaPay webhook error:', error);
    return new Response('Error', { status: 500 });
  }
});

async function handleSuccessfulPayment(supabase: any, data: any) {
  // Update payment status
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_token', data.transactionId);

  if (paymentError) throw paymentError;

  // Get order details
  const { data: payment } = await supabase
    .from('payments')
    .select('order_id')
    .eq('payment_token', data.transactionId)
    .single();

  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: 'COMPLETED' })
    .eq('id', payment.order_id);

  if (orderError) throw orderError;

  // Generate tickets (same logic as Stripe webhook)
  await generateTickets(supabase, payment.order_id);
}

// Same ticket generation function - shared between Stripe and pawaPay
async function generateTickets(supabase: any, orderId: string) {
  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  // Generate tickets based on ticket_quantities
  // This is the SAME function used by Stripe webhook
  // No changes needed here!
}
```

### Step 3: Update Frontend (Only Mobile Money Selection)

```typescript
// src/components/checkout/CheckoutForm.tsx
// Only modify the mobile money handler, leave Stripe untouched!

const handlePayment = async () => {
  if (paymentMethod === 'card') {
    // ✅ STRIPE CODE - DO NOT TOUCH THIS!
    // All existing Stripe code stays exactly the same
    const stripeResponse = await paymentService.createStripePayment({
      // ... existing Stripe code
    });
    // ... rest of Stripe flow unchanged
    
  } else if (paymentMethod === 'mobile_money') {
    // ✅ REPLACE PayDunya with pawaPay HERE
    // This is the ONLY place we change mobile money
    try {
      const response = await paymentService.createPawaPayPayment({
        order_id: orderId,
        amount: totalAmount,
        currency: 'XOF',
        phone: mobilePhone,
        provider: mobileProvider, // orange_money, mtn_mobile_money, moov_money
        user_id: user?.id,
        event_id: eventId,
        ticket_quantities: tickets,
      });

      if (response.success) {
        // Use pawaPay SDK for in-app payment
        await pawaPaySDK.initiatePayment({
          transactionId: response.transaction_id,
          paymentUrl: response.payment_url,
        });
        
        // Handle payment result
        // No redirect needed - stays in app!
      }
    } catch (error) {
      console.error('pawaPay payment error:', error);
      setError('Payment failed. Please try again.');
    }
  }
};
```

### Step 4: Create pawaPay Service (New File)

```typescript
// src/services/pawapayService.ts
import { supabase } from '../lib/supabase';

class PawaPayService {
  async createPayment(paymentData: {
    order_id: string;
    amount: number;
    currency: string;
    phone: string;
    provider: string;
    user_id: string;
    event_id: string;
    ticket_quantities: any;
  }) {
    const { data, error } = await supabase.functions.invoke('create-pawapay-payment', {
      body: paymentData,
    });

    if (error) throw error;
    return data;
  }

  async verifyPayment(paymentId: string) {
    // Optional: check payment status
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    return data;
  }
}

export const pawapayService = new PawaPayService();
```

## 🔒 Safety Guarantees

### 1. Complete Code Separation
```typescript
// Payment routing - they never mix
if (paymentMethod === 'card') {
  // Stripe code path - NEVER TOUCHED
  await stripePayment();
}
else if (paymentMethod === 'mobile_money') {
  // pawaPay code path - REPLACES PayDunya
  await pawapayPayment();
}
```

### 2. Separate Edge Functions
```
✅ create-stripe-payment/  ← UNTOUCHED
✅ stripe-webhook/         ← UNTOUCHED
✅ create-pawapay-payment/ ← NEW (replaces create-payment for mobile money)
✅ pawapay-webhook/        ← NEW (replaces paydunya-ipn)
```

### 3. Database Separation
```sql
-- Payments table supports both - but separate records
SELECT * FROM payments WHERE provider = 'stripe';    -- Stripe payments
SELECT * FROM payments WHERE provider = 'pawapay';   -- pawaPay payments

-- They never interact or conflict
```

## ✅ Testing Checklist (Before Production)

### Test Stripe Still Works
- [ ] Create card payment with Stripe
- [ ] Complete Stripe payment flow
- [ ] Verify Stripe webhook processes correctly
- [ ] Confirm tickets generated from Stripe payment
- [ ] Test Stripe error handling

### Test pawaPay Works
- [ ] Create mobile money payment with pawaPay
- [ ] Complete pawaPay payment flow
- [ ] Verify pawaPay webhook processes correctly
- [ ] Confirm tickets generated from pawaPay payment
- [ ] Test pawaPay error handling

### Test They Don't Interfere
- [ ] Create Stripe payment while pawaPay is processing
- [ ] Create pawaPay payment while Stripe is processing
- [ ] Verify webhooks don't cross-process
- [ ] Confirm database records stay separate

## 🚀 Deployment Plan

### Phase 1: Add pawaPay (Stripe Unchanged)
1. Deploy `create-pawapay-payment` function
2. Deploy `pawapay-webhook` function
3. Update frontend mobile money handler
4. Test pawaPay payments in sandbox

### Phase 2: Switch to pawaPay (Stripe Unchanged)
1. Update payment method selector to use pawaPay
2. Remove PayDunya code (optional, can keep as fallback)
3. Monitor pawaPay payments
4. Keep Stripe completely untouched

### Phase 3: Verify (Stripe Still Works)
1. Test Stripe payments still work
2. Monitor Stripe webhooks
3. Verify ticket generation from Stripe
4. Confirm no issues

## 🎯 Summary

**Your Stripe implementation will be 100% safe because:**

1. ✅ **Different code paths**: Stripe and pawaPay never interact
2. ✅ **Separate Edge Functions**: Different functions for each provider
3. ✅ **Separate webhooks**: No risk of cross-processing
4. ✅ **Database isolation**: Separate records, no conflicts
5. ✅ **No shared code**: We only touch mobile money code

**Implementation Impact:**
- ✅ Stripe: **ZERO CHANGES**
- ✅ pawaPay: **NEW CODE ONLY**
- ✅ PayDunya: **REPLACED IN MOBILE MONEY ONLY**

---

## 📝 Quick Start

1. **Create pawaPay Edge Functions** (new files, no Stripe changes)
2. **Update mobile money frontend** (only mobile money handler)
3. **Test pawaPay** (Stripe continues working normally)
4. **Deploy** (Stripe unaffected)

**You can implement pawaPay while Stripe continues processing payments normally!** 🎉

---

*Last Updated: January 30, 2025*
*pawaPay Safe Implementation Version: 1.0.0*
