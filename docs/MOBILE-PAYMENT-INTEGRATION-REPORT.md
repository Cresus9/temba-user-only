# Mobile Payment Integration Report

Last updated: 2025-11-07

---

## 1. Executive Summary

Temba now processes mobile-money payments entirely through **pawaPay** (XOF) while keeping Stripe for card payments. This report explains how to integrate the existing backend and frontend pieces into the mobile (React Native) application, describes key flows, configuration, and testing requirements, and highlights support considerations.

---

## 2. Architecture Overview

```
Mobile App (React Native)
    ↓
Supabase Edge Functions
    • create-pawapay-payment
    • verify-pawapay-payment
    • pawapay-webhook (optional)
    ↓
pawaPay Merchant API (v2)
    ↓
Supabase Postgres Tables
    • payments
    • orders
    • tickets
```

- **Mobile App** collects payer details and calls Supabase Edge Functions via Supabase JS client.
- **Edge Functions** perform validation, create the payment, update the database, and handle verification/webhook callbacks.
- **pawaPay API** processes the actual mobile money transaction.
- **Database** tracks payment status (`pending`, `completed`, `failed`) and triggers ticket generation once the payment succeeds.

---

## 3. Backend Components

| Function | Purpose | Key Notes |
|----------|---------|-----------|
| `create-pawapay-payment` | Creates a payment record, validates phone/provider, calls pawaPay `/v2/deposits`, stores `transaction_id`. | Requires Bearer token (`PAWAPAY_API_KEY`). Returns `payment_id`, `transaction_id`, `status`. Maps provider status (ACCEPTED/SUBMITTED/COMPLETED/FAILED) to internal statuses. |
| `verify-pawapay-payment` | Polls pawaPay `/v2/deposits/{depositId}` to retrieve latest status. On `COMPLETED`, calls `admin_finalize_payment` RPC which issues tickets and marks order complete. | Accepts `payment_id` and `order_id`. Handles missing `transaction_id` gracefully and provides `error_code`s. |
| `pawapay-webhook` (optional) | Receives asynchronous notifications from pawaPay. | Configure callback URL in the pawaPay dashboard to reduce reliance on polling. |

### Environment Variables (Supabase Functions)

```
PAWAPAY_API_KEY=<production API token>
PAWAPAY_MODE=production  # or sandbox
SUPABASE_URL=https://uwmlagvsivxqocklxbbo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service key>
SITE_URL=https://tembas.com
```

---

## 4. Mobile App Integration (React Native)

### 4.1 Supabase Client Setup

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 4.2 Payment Service Wrapper

```ts
// src/services/pawaPayService.ts
import { supabase } from '../lib/supabase';

export interface PawaPayPaymentRequest {
  order_id: string;
  event_id: string;
  amount_major: number; // major units (e.g. 55)
  phone: string;         // user input, normalised server-side
  provider: 'orange' | 'mtn' | 'moov' | 'wave';
  preAuthorisationCode?: string;
}

export async function createPawaPayPayment(payload: PawaPayPaymentRequest) {
  const { data, error } = await supabase.functions.invoke('create-pawapay-payment', {
    body: {
      idempotency_key: `pawapay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      method: 'mobile_money',
      currency: 'XOF',
      ...payload,
    },
  });

  if (error) throw error;
  return data;
}

export async function verifyPawaPayPayment(paymentId: string, orderId: string) {
  const { data, error } = await supabase.functions.invoke('verify-pawapay-payment', {
    body: { payment_id: paymentId, order_id: orderId },
  });

  if (error) throw error;
  return data;
}
```

### 4.3 UI Flow

1. **Checkout Screen** collects:
   - Phone number (mobile money account)
   - Provider (Orange, Wave, Moov, etc.)
   - Optional OTP input (displayed for Orange Money when required)
2. **Create payment** by calling `createPawaPayPayment`.
3. If response includes `has_payment_redirect` and `payment_url`, open the browser/in-app webview.
4. Otherwise show OTP panel if `requires_pre_auth` is returned.
5. **Poll status** via `verifyPawaPayPayment` until `state` is `succeeded` or `failed`.
6. On success, navigate to the booking confirmation screen and display generated tickets.

### OTP Messaging

Display the following instructions verbatim when OTP is required:

```
Code d’autorisation (OTP) — requis pour valider le paiement

Vérifiez d’abord vos SMS : vous avez peut-être déjà reçu l’OTP automatiquement.

Pas de SMS ? Composez *144*4*6*{montant}# sur votre téléphone Orange Money
(remplacez {montant} par le total à payer.
Entrez l’OTP ci-dessous pour continuer.
```

### Saved Payment Methods

- Saving payment methods is available **only for mobile money**.
- Card (Stripe) checkout relies on Stripe’s native quick-checkout and does not expose the “save method” toggle.

---

## 5. Using `service_fee_rules` to Display the Correct Amount

The `service_fee_rules` table controls every fee applied to buyer and organizer totals. Always derive the displayed service fee from these rules so that the amount the user sees (and pays) matches the configured logic.

### 5.1 How the rules resolve

1. **Ticket type scope** overrides event scope, which overrides global scope.
2. Each rule defines `fee_type` (`PERCENTAGE` or `FIXED`), optional `minimum_fee` / `maximum_fee`, and `applies_to` (`BUYER`, `ORGANIZER`, `SPLIT`).
3. Priority fields (if present) let you prefer certain rules; otherwise the first match in each scope wins.

### 5.2 Primary calculation (RPC)

```ts
const selections = cartItems.map(item => ({
  ticket_type_id: item.id,
  quantity: item.quantity,
  price: item.price,
}));

const { data, error } = await supabase.rpc('calculate_service_fees', {
  p_event_id: eventId,
  p_ticket_selections: selections,
});

// data.total_buyer_fees  -> add to subtotal for the amount due
// data.total_organizer_fees -> reporting/settlement
// data.fee_breakdown -> optional detailed display per ticket/rule
```

The RPC already mirrors the backend fee logic used in web checkout and reporting.

### 5.3 Fallback if the RPC is unavailable

`serviceFeeService.calculateFees()` can be used in the app or server:

- Queries `service_fee_rules` by scope (ticket → event → global).
- Computes fees based on `fee_type`, `fee_value`, and min/max caps.
- Splits amounts into buyer vs organizer totals according to `applies_to`.
- Only falls back to a simple 2 % buyer fee if both RPC and table fetch fail.

### 5.4 Presenting totals to the user

- **Subtotal**: `Σ(price × quantity)`
- **Service fee**: `total_buyer_fees`
- **Total due**: `subtotal + total_buyer_fees`
- Persist the fee details when creating the order so finance and dashboards match the UI.

### 5.5 Testing checklist

- Configure sample rules (percentage, fixed, min/max) and confirm totals change accordingly.
- Verify ticket-type rule overrides event/global rules.
- Ensure organizer share (`total_organizer_fees`) matches expectations.

---

## 6. Back-office / Supabase Schema Touchpoints

### 5.1 `payments` Table

Relevant columns:
- `provider = 'pawapay'`
- `status` (`pending`, `completed`, `failed`)
- `transaction_id` (pawaPay depositId)
- `order_id` (link to `orders`)

Index coverage: `idx_payments_provider_status`, `idx_payments_transaction_id`, `idx_payments_order_id` support fast lookups.

### 5.2 `orders` Table

- `payment_method = 'mobile_money'`
- `status` transitions from `PENDING` → `COMPLETED` via `admin_finalize_payment`

### 5.3 Migrations

- `20250130000002_add_pawapay_provider.sql` ensures provider constraint includes `pawapay`.
- `20250201000001_fix_phone_signup_profiles.sql` & `20250201000002_create_otp_codes_table.sql` support phone auth / OTP storage (shared infra).

---

## 6. Testing Plan

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Successful Orange Money payment | Enter valid phone + OTP, run checkout, poll verification. | Payment transitions to `completed`, tickets generated, confirmation screen displays tickets. |
| Missing OTP | Do not enter OTP when required. | UI keeps OTP panel visible, no toast. Verification refuses to proceed until OTP entered. |
| Invalid OTP | Enter non-numeric or wrong-length OTP. | Form blocks submission; focus remains on OTP input. |
| Phone normalisation | Enter `07XXXXXXXX` and `+226XXXXXXXX`. | Backend stores normalised phone `'226XXXXXXXX'`. |
| Stripe regression | Perform existing Stripe purchase. | Card flow unchanged, ticket generation works. |
| Webhook fallback | (Optional) Configure webhook, trigger payment, ensure webhook marks payment `completed` without polling. |

Automated tests should cover component rendering, service calls, and error handling where possible. Manual end-to-end testing is still required with actual mobile money accounts.

---

## 7. Monitoring & Troubleshooting

1. **Supabase Logs**
   - `create-pawapay-payment` log IDs show payload, response, and any update errors.
   - `verify-pawapay-payment` logs highlight missing `transaction_id`, deposit status, or RPC failures.
2. **Database Checks**
   ```sql
   SELECT id, status, transaction_id
   FROM payments
   WHERE provider = 'pawapay'
   ORDER BY created_at DESC
   LIMIT 20;
   ```
3. **Common error codes**
   - `NO_TRANSACTION_ID`: payment created in DB but API call failed; ask user to retry.
   - `DEPOSIT_NOT_FOUND`: deposit still pending; wait or verify OTP.
4. **Dashboard**: monitor pawaPay dashboard for live transaction status and balances.

---

## 8. Support Playbook

When a user reports an issue:
1. Look up payment by `order_id` or email.
2. Check `transaction_id`—if missing, ask the user to retry payment.
3. If status is `pending` for >5 minutes, manually run verification or inspect pawaPay dashboard.
4. On `failed`, share the failure reason and suggest reattempt with correct OTP or balance check.
5. For successful payments missing tickets, run `SELECT admin_finalize_payment('<payment_id>');`.

---

## 9. Next Steps

- [ ] Integrate polling and OTP panels in the mobile app checkout screen.
- [ ] Implement optional webhook listener if near real-time status updates are required.
- [ ] Add analytics to track success/failure rates for mobile money payments.

---

## 10. References

- Supabase Edge Functions: `supabase/functions/create-pawapay-payment`, `verify-pawapay-payment`, `pawapay-webhook`
- Frontend services: `src/services/pawapayService.ts`, `src/components/checkout/CheckoutForm.tsx`
- Documentation:
  - `docs/PAWAPAY-STRIPE-SEPARATION.md`
  - `docs/MOBILE-CHECKOUT-GUIDE.md`
  - `docs/PAYMENT-SYSTEM.md`

---

Prepared by: Temba Engineering


