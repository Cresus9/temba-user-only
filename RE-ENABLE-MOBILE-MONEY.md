# 🔄 Re-Enable Mobile Money Payments

**When:** After PayDunya identity verification is complete  
**Time Required:** 5 minutes  
**Risk Level:** Low (just uncommenting existing tested code)

---

## 📋 Quick Steps

### **Step 1: Update CheckoutForm.tsx**

File: `/src/components/checkout/CheckoutForm.tsx`

**Change 1:** Update default payment method (Line ~32)
```typescript
// BEFORE:
const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card'); // Default to card - mobile money temporarily disabled

// AFTER:
const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('mobile_money'); // Both payment methods available
```

**Change 2:** Uncomment mobile money button (Lines ~486-530)
```typescript
// BEFORE: (commented out)
{/* TEMPORARILY HIDDEN: Mobile Money - Awaiting PayDunya Identity Verification
<button
  type="button"
  onClick={() => setPaymentMethod('mobile_money')}
  ...
</button>
*/}

// AFTER: (uncommented)
<button
  type="button"
  onClick={() => setPaymentMethod('mobile_money')}
  className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
    paymentMethod === 'mobile_money'
      ? 'border-green-600 bg-green-50'
      : 'border-gray-200 hover:bg-gray-50'
  }`}
>
  <Smartphone className={`h-5 w-5 ${
    paymentMethod === 'mobile_money' ? 'text-green-600' : 'text-gray-400'
  }`} />
  <div className="text-left">
    <p className="font-medium text-gray-900">
      Mobile Money
    </p>
    <p className="text-sm text-gray-500">
      Orange Money, Wave, Moov Money
    </p>
  </div>
</button>
```

**Change 3:** Update card button (remove `disabled` and adjust styling)
```typescript
// BEFORE:
<button
  type="button"
  onClick={() => setPaymentMethod('card')}
  className="flex-1 flex items-center gap-3 p-4 border-2 border-blue-600 bg-blue-50 rounded-lg cursor-default"
  disabled
>

// AFTER:
<button
  type="button"
  onClick={() => setPaymentMethod('card')}
  className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
    paymentMethod === 'card'
      ? 'border-blue-600 bg-blue-50'
      : 'border-gray-200 hover:bg-gray-50'
  }`}
>
```

**Change 4:** Update info message (Lines ~531-537)
```typescript
// BEFORE:
<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-sm text-blue-700">
    <strong>Paiement sécurisé par carte bancaire</strong><br />
    Les paiements Mobile Money seront bientôt disponibles.
  </p>
</div>

// AFTER:
<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
  <p className="text-sm text-green-700">
    <strong>Deux méthodes de paiement disponibles</strong><br />
    Payez par Mobile Money ou carte bancaire en toute sécurité.
  </p>
</div>
```

---

### **Step 2: Test Locally**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test both payment methods:**
   - ✅ Mobile Money: Select Orange/Wave/Moov, enter phone
   - ✅ Card Payment: Enter card details

3. **Verify UI:**
   - Both buttons visible and clickable
   - Switching between methods works
   - Info message updated

---

### **Step 3: Verify PayDunya Configuration**

**Check Supabase Edge Function Environment Variables:**

```bash
# List all secrets
supabase secrets list
```

**Required PayDunya Variables:**
- `PAYDUNYA_MASTER_KEY` ✓
- `PAYDUNYA_PRIVATE_KEY` ✓
- `PAYDUNYA_PUBLIC_KEY` ✓
- `PAYDUNYA_TOKEN` ✓
- `PAYDUNYA_MODE` = `live` (NOT `test`)

**Test PayDunya in Production:**
```bash
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-payment' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "test-paydunya-' $(date +%s)'",
    "user_id": "YOUR_USER_ID",
    "event_id": "YOUR_EVENT_ID",
    "order_id": "YOUR_ORDER_ID",
    "ticket_lines": [...],
    "amount_major": 25000,
    "currency": "XOF",
    "method": "mobile_money",
    "phone": "+221771234567",
    "provider": "orange"
  }'
```

---

### **Step 4: Deploy to Production**

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   # Netlify
   netlify deploy --prod

   # Or Vercel
   vercel --prod

   # Or your deployment method
   ```

3. **Verify Deployment:**
   - Visit production site
   - Check both payment buttons visible
   - Test a small transaction with each method

---

## 🧪 Testing Checklist

### **Mobile Money Payment Test**

- [ ] Button visible and clickable
- [ ] Provider dropdown works (Orange, Wave, Moov)
- [ ] Phone number field accepts input
- [ ] "Save payment method" checkbox works
- [ ] Submit creates PayDunya payment
- [ ] Redirects to PayDunya page
- [ ] Successful payment creates tickets
- [ ] Webhook updates payment status

### **Card Payment Test**

- [ ] Button visible and clickable
- [ ] Stripe Elements loads
- [ ] FX quote displays correctly
- [ ] Card input works
- [ ] Payment processes
- [ ] Webhook creates tickets
- [ ] Success page shows tickets

### **Switching Between Methods**

- [ ] Can switch from Mobile Money to Card
- [ ] Can switch from Card to Mobile Money
- [ ] Form fields clear when switching
- [ ] FX quote loads only for card payments
- [ ] Correct submit button shows for each method

---

## 📊 Monitoring After Re-Enable

### **First Hour**

- [ ] Monitor both payment methods
- [ ] Check success rates for each
- [ ] Verify webhooks for both PayDunya and Stripe
- [ ] Check ticket creation for both methods

### **First 24 Hours**

- [ ] Compare conversion rates
- [ ] Review any failed payments
- [ ] Check customer support feedback
- [ ] Verify both methods working smoothly

---

## 🚨 Rollback (If Needed)

If mobile money has issues after re-enabling:

1. **Quick Disable:**
   - Re-comment the mobile money button code
   - Change default to `'card'`
   - Redeploy (takes ~2 minutes)

2. **Alternative:**
   - Add a feature flag in environment variables
   - Set `VITE_ENABLE_MOBILE_MONEY=false`
   - Check flag before showing button

---

## 📝 Commit Message

```
feat: re-enable mobile money payments

- Uncomment mobile money payment option
- Update default payment method to mobile_money
- Update info message for dual payment methods
- PayDunya identity verification now complete

Closes #[ticket-number]
```

---

## ✅ Verification After Deployment

Run this SQL to check both payment types are working:

```sql
-- Check recent payments by provider
SELECT 
  provider,
  status,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, status
ORDER BY provider, status;
```

**Expected Results:**
- Both `paydunya` and `stripe` providers present
- High completion rate for both
- Low failure rate

---

## 🎉 Success!

Once re-enabled, your users will have two payment options:
- 💳 **Card Payments** (Stripe) - International cards, instant processing
- 📱 **Mobile Money** (PayDunya) - Orange Money, Wave, Moov Money

Both methods have been fully tested and are production-ready!


