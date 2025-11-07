# pawaPay Integration Troubleshooting Guide

## Current Issue: UNKNOWN_ERROR (HTTP 500)

pawaPay is returning a generic `UNKNOWN_ERROR` which makes debugging difficult. This error typically indicates one of the following issues:

## ✅ Checklist

### 1. Account Verification
- [ ] Is your pawaPay account fully activated?
- [ ] Is KYC (Know Your Customer) verification completed?
- [ ] Are you using **production** or **sandbox** credentials? (Check your dashboard)
- [ ] Verify your API key has permission to create payments

### 2. API Configuration
- [ ] **Check your pawaPay dashboard** for the correct API endpoint:
  - Some accounts use: `https://api.pawapay.cloud/v1/payments`
  - Others use: `https://api.pawapay.cloud/v2/payments`
- [ ] **Test v2 endpoint**: If v1 fails, try setting `PAWAPAY_API_VERSION=v2` in Supabase secrets:
  ```bash
  supabase secrets set PAWAPAY_API_VERSION=v2
  ```
- [ ] Verify the API key format (should be a Bearer token)
- [ ] Check if `PAWAPAY_API_SECRET` is required for your account

### 3. Webhook Configuration
- [ ] In your pawaPay dashboard, set the webhook callback URL to:
  ```
  https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook
  ```
- [ ] Verify webhook signing is enabled/disabled correctly
- [ ] Check if webhook URL needs to be verified first

### 4. Payment Method Format
The payment method might need to be a different format. Try these alternatives:

**Current (failing):**
```json
{
  "paymentMethod": "ORANGE_MONEY_BF"
}
```

**Try instead:**
- `"ORANGE"` (simple format)
- `"ORANGE_MONEY"` (without country code)
- Check your dashboard for exact payment method values

### 5. Request Payload Format
Verify these fields match pawaPay's documentation:

**Current payload:**
```json
{
  "amount": {
    "currency": "XOF",
    "value": 1100  // Number format
  },
  "payer": {
    "type": "MSISDN",
    "account": "+22675581026"
  },
  "paymentMethod": "ORANGE_MONEY_BF",
  "reference": "...",
  "description": "...",
  "callbackUrl": "...",
  "returnUrl": "...",
  "cancelUrl": "...",
  "metadata": {...}
}
```

**Potential fixes:**
- Try `value` as string: `"1100"` instead of `1100`
- Try `account` without `+`: `"22675581026"` instead of `"+22675581026"`
- Remove optional fields temporarily to isolate the issue

## 🔍 Debugging Steps

### Step 1: Check pawaPay Dashboard
1. Log into your pawaPay dashboard
2. Go to **Settings** → **API Configuration**
3. Note:
   - Exact API endpoint URL
   - Required headers
   - Payment method format
   - Webhook configuration

### Step 2: Check Logs
Look for this in Supabase function logs:
```
📤 pawaPay Request Payload: {...}
🔍 Provider mapping: { input: "...", mapped: "..." }
```

### Step 3: Test with Minimal Payload
Try creating a payment with only required fields:
- Remove `cancelUrl`
- Remove `metadata` (or keep it minimal)
- Use simplest payment method format

### Step 4: Contact pawaPay Support
If the above doesn't work, contact pawaPay support with:

1. **Payment ID from logs** (e.g., `a4b5ba80-bf46-4232-8504-c031c995e446`)
2. **Exact request payload** from function logs
3. **Error response** from pawaPay
4. **Your API key** (first/last few characters only for security)
5. **Account email/ID**

## 📝 Current Request Details

**Endpoint:** `https://api.pawapay.cloud/v1/payments`  
**Method:** `POST`  
**Headers:**
- `Authorization: Bearer <API_KEY>`
- `Content-Type: application/json`
- `X-API-Secret: <SECRET>` (if configured)

**Request Payload Structure:**
```json
{
  "amount": {
    "currency": "XOF",
    "value": 1100
  },
  "payer": {
    "type": "MSISDN",
    "account": "+22675581026"
  },
  "paymentMethod": "ORANGE_MONEY_BF",
  "reference": "<payment_id>",
  "description": "Billets d'événement - <event_id>",
  "callbackUrl": "https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook",
  "returnUrl": "<frontend_url>",
  "cancelUrl": "<frontend_url>",
  "metadata": {
    "order_id": "<order_id>",
    "payment_id": "<payment_id>",
    "platform": "temba",
    "user_id": "<user_id>",
    "event_id": "<event_id>"
  }
}
```

## 🚨 Next Actions

1. **Verify account status** in pawaPay dashboard
2. **Check API documentation** in dashboard for exact format requirements
3. **Configure webhook URL** in dashboard if not already done
4. **Try sandbox mode** first if available
5. **Contact pawaPay support** with payment ID and request details

## 📞 Support Contact

- **pawaPay Dashboard:** Check your dashboard for support contact
- **Include Payment ID:** Always include the payment ID from logs when contacting support
- **Share Request Payload:** Share the exact payload from function logs (can redact sensitive data)

---

**Last Updated:** After UNKNOWN_ERROR investigation  
**Status:** Waiting for pawaPay account verification/configuration confirmation

