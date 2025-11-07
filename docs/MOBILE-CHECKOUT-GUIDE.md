# Mobile Checkout Guide (pawaPay)

Last updated: {{DATE}}

---

## 1. Overview

This guide explains the end-to-end mobile checkout experience using **pawaPay** for mobile money payments and **Stripe** for card payments. It is written for mobile engineers, product owners, and QA so the flow is easy to understand without digging into the codebase.

Key goals:
- Keep Stripe card payments untouched
- Provide a smooth in-app mobile money checkout
- Make status transitions easy to understand
- Document how to surface the right messages to users

---

## 2. Payment Options at a Glance

| Payment Method | Provider  | Currency | UX summary                                      |
|----------------|-----------|----------|-------------------------------------------------|
| Mobile Money   | pawaPay   | XOF      | In-app form → OTP prompt → polling verification |
| Card (Visa…)   | Stripe    | USD      | Existing Stripe checkout (unchanged)            |

### Decision Tree

```
User taps “Payer”
  ├─ Chooses “Carte”   → Stripe flow (existing)
  └─ Chooses “Mobile Money” → pawaPay flow (new)
```

You only need to wire the mobile money branch to pawaPay. The Stripe branch reuses the existing components and services.

---

## 3. pawaPay Mobile Flow

### 3.1 UX Steps

1. **Collect payment details**
   - Phone number (E.164 or local; backend normalises to `226XXXXXXXX`)
   - Provider (`orange`, `mtn`, `moov`, `wave` → backend maps to pawaPay codes)
   - Optional: OTP field when Orange Money BF requires it

2. **Call `create-pawapay-payment` Edge Function**
   - Endpoint: `POST https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-pawapay-payment`
   - Request body (minimal):
     ```json
     {
       "idempotency_key": "pawapay-<timestamp>-<random>",
       "order_id": "<UUID>",
       "event_id": "<UUID>",
       "user_id": "<auth_user_id>",
       "buyer_email": "user@example.com",
       "ticket_lines": [...],
       "amount_major": 5500,
       "currency": "XOF",
       "method": "mobile_money",
       "phone": "75581026",
       "provider": "orange",
       "preAuthorisationCode": "654375" // optional, required for Orange BF
     }
     ```

3. **Show confirmation screen**
   - If response is `status: "ACCEPTED"`, inform user that the payment is in progress and you are waiting for confirmation.
   - Display instructions for Orange Money: e.g. “Compose *144*4*6*AMOUNT# to generate OTP.”

4. **Poll verification**
   - Frontend calls `verify-pawapay-payment` every few seconds until status changes from `pending`/`processing` to `completed` or `failed`.
   - Endpoint: `POST https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/verify-pawapay-payment`
   - Body:
     ```json
     {
       "payment_id": "<UUID>",
       "order_id": "<UUID>"
     }
     ```

5. **Success**
   - When verification returns `success: true` and `state: "succeeded"`, redirect to booking confirmation and display tickets.

6. **Failure**
   - Verification may return `state: "failed"` with a clear `message` field.
   - Show the message to the user and allow retry.

### 3.2 State Mapping

| pawaPay status | Stored payment status | What to show users                        |
|----------------|-----------------------|------------------------------------------|
| `ACCEPTED`     | `pending`             | “Paiement en cours de traitement…”       |
| `SUBMITTED`    | `pending`             | Same as above                            |
| `COMPLETED`    | `completed`           | “Paiement confirmé !”                    |
| `FAILED`       | `failed`              | “Paiement refusé : <message>`            |

> Note: the Edge Function already normalises the status, so the `payments.status` column will always be `pending`, `completed`, or `failed`.

### 3.3 Error Scenarios & Messages

| Scenario | API response | Suggested UI copy |
|----------|--------------|-------------------|
| Invalid OTP / missing OTP | 400 with `message` referencing `preAuthorisation` | “Le code OTP Orange est requis. Composez *144*4*6*montant# puis réessayez.” |
| Deposit not found yet | `state: "processing"`, `message: "Deposit not found…"` | “Paiement en vérification. Nous confirmons sous 1 minute.” |
| Payment never created | `state: "failed"`, `message: "Payment was never created…"` | “Le paiement n'a pas été initialisé. Vérifiez votre réseau puis réessayez.” |
| Provider validation error | 400 with failureReason | Map to provider instructions (display returned message) |

### 3.4 UI Checklist

- [ ] Mobile money form includes phone + provider selection
- [ ] Supports OTP entry when needed
- [ ] Shows spinner/toast during `pending`
- [ ] Retries verification up to a sensible limit (e.g. 10 times / 30 seconds)
- [ ] Allows manual refresh from confirmation screen
- [ ] Displays receipt / tickets once verification succeeds
- [ ] Provides retry button when verification fails

---

## 4. Stripe Card Flow (Reference)

The card path is unchanged. Retain the existing `create-stripe-payment` call, payment intent confirmation, and webhook handling. Just ensure the UI copy clarifies which currency is being charged (USD) and that users will see the conversion on their statement.

---

## 5. Backend Touchpoints

| Edge Function                | Purpose                               | Notes |
|-----------------------------|---------------------------------------|-------|
| `create-pawapay-payment`    | Creates payment row + calls pawaPay  | Stores `transaction_id`, sets status `pending/completed/failed` |
| `verify-pawapay-payment`    | Polls `/v2/deposits/{id}`             | Triggers `admin_finalize_payment` when completed |
| `pawapay-webhook` (optional)| Asynchronous status updates           | Configure in pawaPay dashboard for instant notifications |
| `create-stripe-payment`     | Existing card flow                    | Unchanged |
| `verify-payment`            | Stripe verification                   | Unchanged |

If you enable the pawaPay webhook, the verification step can be shorter because the webhook will flip the status to `completed` immediately.

---

## 6. Testing Scenarios

| Test | Steps |
|------|-------|
| Successful Orange Money payment | Use real OTP, ensure status moves from `pending` → `completed`, tickets generated |
| Missing OTP | Submit without `preAuthorisationCode`, expect client-side validation and backend error message |
| Invalid phone format | Attempt `07XXXXXX`; verify backend normalises / rejects appropriately |
| Network interruption | Simulate offline after payment creation; when app reconnects, verification should still succeed |
| Stripe regression | Run existing Stripe checkout to confirm there is no impact |

---

## 7. Implementation Checklist

1. ✅ Update checkout UI with provider + phone + optional OTP
2. ✅ Route mobile money branch to `pawapayService.createPayment`
3. ✅ Handle `ACCEPTED` / `processing` states with polling
4. ✅ Surface error messages returned by verification
5. ✅ Confirm tickets appear in confirmation screen when payment succeeds
6. ✅ Update support documentation with new error messages and translations
7. ✅ Monitor Supabase logs for any `NO_TRANSACTION_ID` errors (should be fixed now)

---

## 8. Support Playbook

When a user reports a payment issue:

1. Check `payments` table for `provider = 'pawapay'` and the relevant `order_id`.
2. If `transaction_id` is `NULL`, inspect `create-pawapay-payment` logs to find the error and ask user to retry.
3. If `status = 'pending'` for several minutes, run `verify-pawapay-payment` manually or check the pawaPay dashboard.
4. If `status = 'failed'`, share the failure reason and instruct the user accordingly (OTP, balance, etc.).
5. For successful payments with missing tickets, run the `admin_finalize_payment` RPC manually.

---

## 9. References

- Edge functions: `supabase/functions/create-pawapay-payment`, `verify-pawapay-payment`
- Frontend services: `src/services/pawapayService.ts`, `src/components/checkout/CheckoutForm.tsx`
- pawaPay documentation: [How to authenticate calls](https://docs.pawapay.io/v2/docs/how_to_start#how-to-authenticate-calls-to-the-merchant-api)
- Stripe documentation: [Confirming card payments](https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=elements)

---

Keep this guide updated whenever you tweak the checkout experience or add new providers. It should always be the single source of truth for the product and support teams.


