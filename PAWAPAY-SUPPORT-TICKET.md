# pawaPay Support Ticket Template

## Issue: UNKNOWN_ERROR (HTTP 500) When Creating Payments

### Account Information
- **Account Email**: [Your pawaPay account email]
- **API Key**: [First 10 chars of your API key for reference]
- **Environment**: Production
- **API Endpoint Used**: `https://api.pawapay.cloud/v1/payments`

### Error Details
**Error Code**: `UNKNOWN_ERROR`  
**HTTP Status**: `500 Internal Server Error`  
**Error Message**: `"Unable to process request due to an unknown problem."`

**Latest Payment ID**: `db226720-8d7a-43c8-98f6-c52a7adbd645`

### Request Payload
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
  "reference": "db226720-8d7a-43c8-98f6-c52a7adbd645",
  "description": "Billets d'événement - 560eba92-a66d-41e5-95cc-c266e6994588",
  "callbackUrl": "https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook",
  "returnUrl": "http://localhost:5174/payment/success?order=49490bde-8b02-4da5-a9fd-87de22e729b5",
  "cancelUrl": "http://localhost:5174/payment/cancelled?order=49490bde-8b02-4da5-a9fd-87de22e729b5",
  "metadata": {
    "order_id": "560eba92-a66d-41e5-95cc-c266e6994588",
    "payment_id": "db226720-8d7a-43c8-98f6-c52a7adbd645",
    "platform": "temba",
    "user_id": "ba4bee8a-c7dc-4831-94c1-93ae7953c036",
    "event_id": "560eba92-a66d-41e5-95cc-c266e6994588"
  }
}
```

### HTTP Headers
- `Content-Type`: `application/json`
- `Authorization`: `Bearer [API_KEY]`
- `X-API-Secret`: [Not configured - optional]

### Response from pawaPay
```json
{
  "failureReason": {
    "failureCode": "UNKNOWN_ERROR",
    "failureMessage": "Unable to process request due to an unknown problem."
  }
}
```

### Questions for pawaPay Support

1. **Account Status**: Is my account fully activated and KYC completed?
2. **API Endpoint**: Should I be using `/v1/payments` or `/v2/payments`?
3. **Payment Method Format**: Is `ORANGE_MONEY_BF` the correct format? Should it be `ORANGE`, `ORANGE_MONEY`, or something else?
4. **Webhook Configuration**: Is the webhook URL required to be configured before creating payments?
5. **Amount Format**: Should `amount.value` be a number or string?
6. **Phone Format**: Should the phone number include the `+` prefix or not?
7. **Account Restrictions**: Are there any account-level restrictions preventing payment creation?

### Additional Payment IDs for Testing
- `f1bb2b39-d724-41d3-acfb-08a118011c7c`
- `a4b5ba80-bf46-4232-8504-c031c995e446`
- `0d78b2f1-5a9b-472d-8450-d1b45b8b73f1`

### What We've Tried
1. ✅ Provider mapping: `"orange"` → `"ORANGE_MONEY_BF"`
2. ✅ Amount as number format: `1100` (not string)
3. ✅ Phone number in MSISDN format: `+22675581026`
4. ✅ All required fields included
5. ✅ Proper headers with Bearer token authentication

### Next Steps Requested
Please provide:
1. Exact reason for `UNKNOWN_ERROR`
2. Correct API endpoint version
3. Correct payment method value format
4. Any missing configuration steps
5. Whether sandbox/test mode is available for testing

---

**Timestamp**: 2025-11-02 08:09:15 GMT  
**Platform**: Temba Ticket Platform  
**Integration Type**: Mobile Money (Orange Money - Burkina Faso)

