# Referral phase 1 — apply order

Nothing in this change is applied to Temba-EU and no edge function is deployed. `program_enabled` and `reseller_program_enabled` stay `false` until the enable script below.

## What the patch changes

- `?r=CODE` is stored for 30 days (last click). `?ref=` is still accepted.
- Checkout sends the code. The payment functions write it on the order they just created, or on an unpaid order the caller owns (buyer session or guest token). They do not replace a code already stored. The database resolves it to a referrer or a reseller, and blocks self-referral.
- When the order becomes `COMPLETED` inside `admin_finalize_payment`, the existing order trigger writes `reward_ledger`. The key is unique, so a webhook replay does not pay twice. Rows stay `pending` until the day after the event. Cancel and a Stripe refund insert a reversal row.
- A checkout with no code does not write a reward and does not change the amount.
- New rewards are not added to `user_credits` and are not deducted at payment.
- Users can read their own ledger rows. They can no longer insert, update, or truncate `credit_transactions`, `user_credits`, or `referral_rewards`. `grant-signup-bonus` keeps working only if it writes with the service role.

## SQL, in order

1. `supabase/patches/20261118_referral_phase1.sql`
2. Deploy the functions below.
3. `supabase/patches/20261118_referral_phase1_enable.sql` when rewards should start.
4. Optional, read-only: `supabase/patches/20261118_referral_phase1_test_plan.sql`

Rollback, only if the phase should come back off: `supabase/patches/20261118_referral_phase1_rollback.sql`.

Do not run `npm run deploy:functions:paris`. Deploy these functions one by one after the SQL:

1. `create-stripe-payment`
2. `create-pawapay-payment`
3. `finalize-order`
4. `stripe-webhook`
5. `complete-referral` (returns 410 and writes nothing)
6. `generate-referral-link` (share URL is `https://tembas.com/?r=CODE`)

`_shared/attribution.ts` is bundled into the payment functions. No change to `admin_finalize_payment`.

## Conflict with PR 13

PR 13 (`cursor/payment-date-finalize-auth-6b3d`) edits the same payment functions and does not touch this SQL. Merge by keeping both edits:

| File | This PR | PR 13 |
|---|---|---|
| `create-stripe-payment` | `attachAttributionCode` after the order id is known | `event_date_id` and `line_allocations` on the order insert |
| `create-pawapay-payment` | same attach call | date fields on the order insert |
| `finalize-order` | `recordAttributionIfPresent` before the existing email call | visit-date stamp and finalize auth |
| `stripe-webhook` | new `charge.refunded` branch | guard on `payment_intent.payment_failed` |

This PR does not edit `pawapay-webhook`, `check-pawapay-status`, `verify-payment`, `verify-pawapay-payment`, `process-finalize-jobs`, ticket email, QR signing, or `line_allocations`.

## Checks already run here

`npx vitest run src/lib/attribution/rules.test.ts` covers last-click capture, self-referral, an ambiguous code, idempotency keys, a zero-rate commission, the no-code plan, the hold date, and a one-time reversal.

Not run against production: no card, no Mobile Money, no email, no SQL apply.
