# Mobile Guest Checkout — Implementation Guide

**Audience:** mobile engineers (iOS / Android / React Native). This is **not** the Vite web app. Web and mobile share the same Supabase project.

**Last updated:** 26 August 2026  
**Production project (Paris / EU):** `https://wlyncuwbzhzjafmqozcm.supabase.co`

Always pair **URL + anon (publishable) key from this project**. Never mix with the legacy US project `uwmlagvsivxqocklxbbo`. Older mobile docs (`MOBILE-CHECKOUT-GUIDE.md`, `MOBILE-INTEGRATION.md`) still mention the US URL — ignore those hosts.

Related:

- PawaPay UX (OTP, polling, Orange `#` codes): [MOBILE-CHECKOUT-GUIDE.md](./MOBILE-CHECKOUT-GUIDE.md) — use Paris URL and **omit `user_id`** for guests.
- Account “Mes Billets”: [MES-BILLETS-LOGIC.md](./MES-BILLETS-LOGIC.md) — that query is `tickets.user_id = auth.uid()`. Guest tickets often have **`user_id` null until claim**.
- Ticket transfers to people without an account: [UNREGISTERED-USER-FLOW.md](./UNREGISTERED-USER-FLOW.md) — a different product (pending transfers), not guest checkout.

---

## 1. Product in one paragraph

A guest buys the **same ticket** as a logged-in buyer. Same `tickets` row, same `qr_code`, same door scan. Guest vs account is **how the buyer finds the QR**, not a different ticket type.

Do **not** invent a parallel tickets table. Do **not** query `guest_ticket_details` (it is not a reliable production view). Load QR via the `lookup-guest-tickets` edge function.

**UI language:** French. Currency: **FCFA (XOF)**. Default payment: **Orange Money**, then **Moov Money**, then **card (Stripe)**.

---

## 2. Contact rules (must match web)

| Method | Required | Optional |
|---|---|---|
| Orange / Moov | **Payment phone** (E.164). Store this on `guest_orders.phone`. It is how tickets are recovered. | Email |
| Card | **Email or phone** (at least one) | The other |

Phones can be **any country**. Default country in the picker is **+226** (Burkina). If the user already typed `+1`, `+225`, `+33`, etc., **do not rewrite it to +226**.

When the buyer has no real inbox, persist a **placeholder** so DB constraints pass:

```
{digits}@temba.temp
```

Example: `+226 70 00 00 00` → `22670000000@temba.temp`.

- Never show `@temba.temp` in UI, receipts, or “we sent a mail” copy.
- Never use a placeholder as an email lookup / OTP destination.
- `guest_orders.email` is **NOT NULL** — always send the resolved value (real email or placeholder).

Helper (copy this logic):

```ts
function isPlaceholderGuestEmail(email?: string | null) {
  return !(email || '').trim() || email.trim().toLowerCase().endsWith('@temba.temp');
}

function realGuestEmail(email?: string | null) {
  const t = (email || '').trim().toLowerCase();
  if (!t || t.endsWith('@temba.temp')) return undefined;
  return t;
}

function resolveGuestEmail(email?: string | null, phone?: string | null) {
  const real = realGuestEmail(email);
  if (real) return real;
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 8) return `${digits}@temba.temp`;
  return '';
}
```

Phone match for recovery uses **full digit string or last 8 digits** (so `+22670000000` matches `70000000`).

---

## 3. What you connect to (tables)

You **read** these. You **do not** insert tickets from the app. Webhooks / `admin_finalize_payment` / `finalize-order` create ticket rows after money lands.

```
guest_orders ──order_id──► orders ──id──► tickets
                                │            │
                                │            ├── ticket_type_id → ticket_types
                                │            └── event_id       → events
                                └── event_id → events
payments.order_id → orders
otp_codes (email/phone recovery when OTP is on)
profiles (after login, for claim)
```

### `guest_orders` — retrieval wallet

| Column | Notes |
|---|---|
| `order_id` | FK to `orders.id` |
| `email` | NOT NULL. Real inbox **or** `{digits}@temba.temp` |
| `phone` | E.164 preferred. **Required for Orange/Moov.** Used for lookup |
| `name` | Buyer display name |
| `token` | UUID. **This is the guest session.** Persist on device (Keychain / SecureStore) |

Anon RLS does **not** let the mobile client select this table usefully. Always go through edge functions for lookup.

### `orders`

| Column | Guest value |
|---|---|
| `user_id` | **null** until claim |
| `guest_email` | **Required** when `user_id` is null (`order_user_or_guest_check`). Same resolved email as above |
| `status` | `AWAITING_PAYMENT` → `COMPLETED` (or `CANCELLED` / `EXPIRED`) |
| `ticket_quantities` | JSON `{ "<ticket_type_uuid>": qty }` |
| `payment_method` | `MOBILE_MONEY` or `CARD` |
| `event_id` | UUID |
| `event_date_id` | Visit / session date when relevant (attractions, multi-date) |
| `total` | Ticket subtotal from the RPC (fees/addons may live on the **payment** amount — see §6) |
| `visible_in_history` | false until payment completes |

If `user_id` is null and `guest_email` is null, insert **fails** (constraint). That is the #1 card-guest 500.

### `tickets`

Same schema as account buyers. After pay:

- `qr_code` — render this
- `order_id` — join key
- `user_id` — **often null for guests** until `claim-guest-orders`
- `status` — typically `VALID`

**Do not** `select * from tickets where user_id is null` as the guest. RLS will hide rows. Use `lookup-guest-tickets` `{ action: "tickets", token }`.

### Do not use

| Thing | Why |
|---|---|
| `guest_ticket_details` | Not a reliable prod view |
| Direct `tickets` insert from the client | Tickets are created by payment finalize |
| Joining `events` → `organizer_profiles` in one select | No FK; query separately if you need organizer copy |

---

## 4. Edge functions & RPC (auth)

Base: `POST https://wlyncuwbzhzjafmqozcm.supabase.co/functions/v1/<name>`

Headers on every call:

```
Content-Type: application/json
apikey: <PARIS_PUBLISHABLE_OR_ANON_KEY>
Authorization: Bearer <user_access_token | same_publishable_key>
x-application-name: Temba
```

Guests have no user JWT. Send the **publishable key** as Bearer. Functions with `verify_jwt = false` accept that.

Prefer raw `fetch` over `supabase.functions.invoke` for payments: invoke often collapses 4xx/5xx into `"Edge Function returned a non-2xx status code"` and hides the real body.

| Function / RPC | JWT | Who calls it |
|---|---|---|
| RPC `guest_order_processor` | Anon (public execute) | Guest **mobile money** order create |
| `create-pawapay-payment` | false | Start Orange/Moov |
| `verify-pawapay-payment` / `verify-payment` | false | Poll after pay |
| `create-stripe-payment` | false | Guest **and** account card |
| `lookup-guest-tickets` | false | Find / load QR |
| `claim-guest-orders` | **true** | After login only |
| `stripe-webhook` / `pawapay-webhook` | false | **PawaPay/Stripe servers only** — do not call from the app |

---

## 5. Flows

### 5.1 Orange / Moov (guest)

```
Collect name + payment phone (+ optional email)
        │
        ▼
RPC guest_order_processor  →  { success, order_id, token }
        │
        ├─ Persist token + order_id + phone (+ real email) on device
        │
        ▼
POST create-pawapay-payment
  user_id omitted
  buyer_email = resolveGuestEmail(...)  // required by the EF even for phone-only
  phone = payment number
  order_id, event_id, amount_major = grand total (tickets + fees + addons)
        │
        ▼
Poll verify-pawapay-payment / verify-payment until COMPLETED
        │
        ▼
POST lookup-guest-tickets { action: "tickets", token }
        │
        ▼
Show QR (same component as Mes Billets)
```

**RPC call** (Supabase JS):

```ts
const resolvedEmail = resolveGuestEmail(email, phone); // never empty

const { data, error } = await supabase.rpc('guest_order_processor', {
  p_email: resolvedEmail,
  p_name: name.trim(),
  p_phone: phoneE164,           // payment number
  p_event_id: eventId,
  p_payment_method: 'MOBILE_MONEY',
  p_ticket_quantities: { [ticketTypeId]: qty },
  p_payment_details: {
    provider: 'orange',         // or 'moov'
    phone: phoneE164,
    // Live RPC has no p_event_date_id arg (PostgREST 404 if you send it).
    ...(eventDateId ? { event_date_id: eventDateId } : {}),
  },
});

// data.success, data.order_id, data.token
```

`p_email` must look like an email (`…@…`) because the RPC regex-checks it — placeholders satisfy that.

Then PawaPay (guest differences vs the logged-in guide):

```json
{
  "idempotency_key": "mobile-pawapay-<timestamp>-<random>",
  "order_id": "<from RPC>",
  "event_id": "<uuid>",
  "phone": "+22670000000",
  "provider": "orange",
  "method": "mobile_money",
  "amount_major": 5500,
  "currency": "XOF",
  "ticket_lines": [
    { "ticket_type_id": "<uuid>", "quantity": 2, "price_major": 2500, "currency": "XOF" }
  ]
}
```

Omit `user_id`. Always send `buyer_email` as `resolveGuestEmail(...)` (placeholder `{digits}@temba.temp` if they typed no inbox). The edge function currently 400s without `buyer_email` or `user_id`. PawaPay v2 charges the MSISDN; it does not mail that address.

Poll like the logged-in flow until tickets exist, then load QR with the **token**, not with `tickets.user_id`.

### 5.2 Card / Stripe (guest)

**Do not** call `guest_order_processor` for card. That would create a second order. Card guests go **only** through `create-stripe-payment` with `create_order: true`. The function inserts `orders` + `guest_orders` with service role (needed for `order_user_or_guest_check`).

```json
POST /functions/v1/create-stripe-payment

{
  "event_id": "<uuid>",
  "create_order": true,
  "order_id": null,
  "user_id": null,
  "ticket_quantities": { "<ticket_type_uuid>": 2 },
  "payment_method": "CARD",
  "guest_email": "22670000000@temba.temp",
  "guest_phone": "+22670000000",
  "amount": 550000,
  "currency": "XOF",
  "amount_is_minor": true,
  "idempotencyKey": "mobile-stripe-<uuid>"
}
```

`guest_email` must be `resolveGuestEmail(...)`. `guest_phone` is the recovery number when they typed one.

Response:

```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentId": "<uuid>",
  "orderId": "<uuid>",
  "paymentToken": "<string>",
  "guestToken": "<uuid>"
}
```

1. Persist `guestToken` + `orderId` immediately (before Stripe confirm). If the app is killed after pay, this is how you reopen the QR.
2. Confirm the PaymentIntent with the Stripe iOS/Android/RN SDK (`clientSecret`).
3. Poll `verify-payment` with `payment_id` / `order_id` until tickets exist.
4. `lookup-guest-tickets` `{ action: "tickets", token: guestToken }`.

FX: web often calls `fx-quote` then sends `display_amount_minor`, `charge_amount_minor`, `fx_num`, `fx_den`, `fx_locked_at`. Reuse the same Stripe path you already use for **logged-in** cards; only add `create_order`, `guest_email`, `guest_phone`, and omit `user_id`.

### 5.3 After payment — show QR

```json
POST /functions/v1/lookup-guest-tickets
{ "action": "tickets", "token": "<guestToken>" }
```

Success:

```json
{
  "success": true,
  "found": true,
  "token": "...",
  "orderId": "...",
  "eventTitle": "...",
  "eventDate": "YYYY-MM-DD",
  "eventTime": "...",
  "eventLocation": "...",
  "eventImage": "...",
  "guestEmail": "real@inbox.com",
  "guestPhone": "+226...",
  "tickets": [
    {
      "id": "...",
      "order_id": "...",
      "qr_code": "...",
      "status": "VALID",
      "ticket_type_name": "Standard",
      "ticket_type_price": 2500,
      "event_title": "...",
      "event_date": "YYYY-MM-DD",
      "event_time": "...",
      "event_location": "...",
      "event_image": "...",
      "guest_phone": "+226...",
      "token": "..."
    }
  ]
}
```

- `found: true` with `tickets: []` means the order exists but finalize has not written tickets yet — keep polling `verify-payment`, then retry `tickets`.
- Parse `event_date` as a **local calendar date**. Never `new Date("YYYY-MM-DD")` (UTC shift → previous day).

Render `qr_code` with the same scanner-facing format as Mes Billets.

Share (optional): `https://tembas.com/guest/tickets/<token>` (WhatsApp). Token is a capability URL — treat it like a session.

### 5.4 Recover tickets on another phone (“Retrouver mes billets”)

Device-local list is **not** a login. It is a wallet of tokens you stored (web: `localStorage` key `temba_guest_wallets`). On mobile: SecureStore / Keychain. Cap ~20 entries.

To recover without the token:

```json
{ "action": "verify", "phone": "+22670000000" }
```

or

```json
{ "action": "verify", "email": "buyer@example.com" }
```

Response:

```json
{
  "success": true,
  "channel": "phone",
  "tokens": ["<uuid>", "..."],
  "previews": [
    { "token": "...", "orderId": "...", "eventTitle": "...", "eventDate": "...", "ticketCount": 2 }
  ],
  "skip_otp": true
}
```

`ticketCount: 0` = paid order still waiting on ticket insert — show “QR en préparation”, keep the token.

**OTP (implement this even if it is skipped in staging):**

| Channel | Send code | Verify |
|---|---|---|
| Email | `{ "action": "send", "email": "..." }` → Resend mail | `{ "action": "verify", "email": "...", "code": "123456" }` |
| Phone | Use existing **auth SMS OTP** (same stack as phone login) | `{ "action": "verify", "phone": "...", "code": "123456" }` |

Production **must** send `code` once `SKIP_OTP` is false on `lookup-guest-tickets`. Today staging may return `skip_otp: true` and accept verify without a code. Build the OTP UI anyway; gate it on `skip_otp` in the response so you do not ship a permanent bypass.

Codes live in `otp_codes` (10 min, 5 attempts). Placeholder emails are rejected on `send` / email `verify`.

### 5.5 After the buyer logs in or signs up

Call **once** with the **user JWT**:

```json
POST /functions/v1/claim-guest-orders
Authorization: Bearer <access_token>

{ "tokens": ["<from SecureStore>", "..."] }
```

`tokens` is optional but recommended: it attaches orders this device paid even if profile email/phone differ.

The function:

1. Finds `guest_orders` by profile email, profile phone (last-8 match), and those tokens.
2. Also picks up orphan `orders` where `user_id` is null and `guest_email` matches (skips `@temba.temp` for email search).
3. Sets `orders.user_id` and `tickets.user_id` to the logged-in user.

Response: `{ "success": true, "claimed": 2 }`.

Then **Mes Billets** (`tickets.user_id = auth.uid()`) shows the same QR. You can drop the guest token from SecureStore after a successful claim.

Trigger this on session start (web does it in auth context after login).

---

## 6. Money: fees and add-ons

Grand total paid to PawaPay / Stripe **must** include:

- ticket subtotal
- service fees (`calculate_service_fees` RPC; if it 400s, use a client fallback — do not invent columns)
- venue extras / food: pass as `addonTotal` into checkout and **add it to `amount_major` / Stripe amount**

If extras never reach the payment payload, that money is lost. Permanent attractions on web seed `addonTotal` from the booking panel for this reason.

Payment method order in the UI: **Orange → Moov → card**.

---

## 7. Permanent attractions (`events.is_permanent = true`)

Web guests **do not** call `initiate_permanent_purchase` (that RPC expects an authenticated user). They go through the same checkout with:

- `event_date_id` = selected visit date (`event_dates.id`)
- paid amount = tickets + fees + `addonTotal`

If mobile still requires login before attraction pay, that is a product choice — the **backend** path above already works for guests. Do not insert tickets yourself either way.

Dates: use a local-date parser equivalent to web `parseLocalDate`. Calendar dates are `YYYY-MM-DD` without timezone.

---

## 8. Device wallet (recommended)

Store (encrypted):

```ts
type GuestWallet = {
  token: string;
  orderId: string;
  phone?: string;   // E.164
  email?: string;   // real inbox only
  savedAt: string;  // ISO
};
```

Save **as soon as** you receive `token` from the RPC or `guestToken` from Stripe — before the user confirms Orange / Stripe. After kill/resume, open QR from this list (“Déjà sur cet appareil”).

This is **not** a session. Clearing app storage loses the list; recovery is phone/email (+ OTP in prod).

---

## 9. RLS — what the client can and cannot do

| Action | Client (anon) | How |
|---|---|---|
| Create guest MM order | Yes | RPC `guest_order_processor` (`SECURITY DEFINER`) |
| Create guest card order | No direct insert | `create-stripe-payment` (service role) |
| Insert `tickets` | No | Webhooks / finalize |
| Select `guest_orders` by phone | No (not reliable) | `lookup-guest-tickets` |
| Select `tickets` by `user_id` | Yes, **own** rows only | After claim, Mes Billets |
| Select guest tickets by token | No | `lookup-guest-tickets` `action: tickets` |
| Attach orders to account | No | `claim-guest-orders` + user JWT |

---

## 10. Copy / UX notes (French)

- Guest checkout CTA: buy without creating an account.
- After pay: “Vos billets” + QR, not “créez un compte pour voir le QR” (account is optional, for Mes Billets + transfers).
- Recovery: phone first (matches Orange/Moov). Email second.
- Never display `@temba.temp`.
- Support: support@tembas.com · +226 74 75 08 15.

Web reference screens (not to copy pixel-for-pixel): `/find-tickets`, `/guest/tickets/:token`. Account tickets stay on `/profile/my-tickets`.

---

## 11. Implementation checklist

- [ ] Paris URL + matching publishable key only
- [ ] MM: `guest_order_processor` → persist token → `create-pawapay-payment` without `user_id` → poll verify → `action: tickets`
- [ ] Card: `create-stripe-payment` `create_order: true` + resolved `guest_email` / `guest_phone` → persist `guestToken` → Stripe SDK → poll → `action: tickets`
- [ ] `order_user_or_guest_check` satisfied (never null `guest_email` on guest orders)
- [ ] Placeholder email helper; never shown; never used for OTP
- [ ] International phones; default +226; never force 226 onto +1 / +225 / +33
- [ ] SecureStore wallet of tokens
- [ ] Recovery `verify` by phone/email; OTP UI ready for `skip_otp: false`
- [ ] On login: `claim-guest-orders` with stored tokens, then Mes Billets
- [ ] Add-ons/food in `amount_major`
- [ ] Attractions: visit date inside `p_payment_details.event_date_id` (do **not** send RPC arg `p_event_date_id`) + extras in the charge
- [ ] No client ticket inserts; no `guest_ticket_details`
- [ ] Date-only fields parsed as local dates

---

## 12. Common failures

| Symptom | Cause | Fix |
|---|---|---|
| RPC 404 `guest_order_processor` / schema cache | Client sent `p_event_date_id` | Live function has 7 args only; put visit date in `p_payment_details` |
| `Edge Function returned a non-2xx` with no body | `functions.invoke` swallowing the error | `fetch` + parse JSON `error` |
| Empty Mes Billets after guest pay | `tickets.user_id` still null | Show guest QR via token; claim after login |
| Empty lookup by email | They paid phone-only | Lookup by **payment phone**; email was `@temba.temp` |
| US number stored as `+2261917…` | App prefixed 226 onto a number that already had a country code | Keep E.164; if `startsWith('+')`, do not rewrite |
| QR never appears | Finalize still running | Poll `verify-payment`; `found` with `ticketCount: 0` is expected briefly |
| Duplicate orders on card | Called RPC **and** `create_order: true` | Card = Stripe function only |
| 401 on `create-stripe-payment` | Sending nothing / wrong project JWT | `verify_jwt = false`; Bearer = publishable key; Paris project |
| 401 on `claim-guest-orders` | Guest or anon key | Requires **user** access token |

---

## 13. Minimal TypeScript client (copy/adapt)

```ts
const SUPABASE_URL = 'https://wlyncuwbzhzjafmqozcm.supabase.co';

async function postFn<T>(name: string, body: Record<string, unknown>, userJwt?: string): Promise<T> {
  const key = PARIS_PUBLISHABLE_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${userJwt || key}`,
      'x-application-name': 'Temba',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
  return json as T;
}

// After MM RPC or Stripe create_order:
await postFn('lookup-guest-tickets', { action: 'tickets', token });

// Recovery:
await postFn('lookup-guest-tickets', { action: 'verify', phone: '+22670000000' });

// After login:
await postFn('claim-guest-orders', { tokens: storedTokens }, session.access_token);
```
