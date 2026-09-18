# WhatsApp ticket booking (adapter contract)

Buyer-facing WhatsApp checkout is **not** this Vite app. It lives in a sibling service (`temba-whatsapp-bot`). TEMBA (Paris Supabase + this site) stays the ledger: catalog, `guest_order_processor`, PawaPay, tickets, door QR.

**Do not** put the Cloud API token in Vite. **Do not** insert `tickets` from the adapter. **Do not** migrate a slug column unless asked. **Do not** rebuild `pawapay-webhook`.

## Share links

Organizers post either:

- `https://wa.me/{NUMBER}?text={SLUG}`
- `https://tembas.com/w/{SLUG}` → Netlify edge **302** to the same `wa.me` (env `WHATSAPP_WA_ME_NUMBER`, digits only)

`SLUG` is a flyer key (`EVENT_SLUG_MAP` on the bot) or the event UUID. It is stored on the order as `p_payment_details.flyer_slug` (jsonb). No new column.

Support **+226 74 75 08 15** stays human. The bot is a **second** Cloud API number. Keyword `agent` mutes that thread 24h.

## TEMBA calls the adapter already uses

| Need | Call |
|---|---|
| Catalog | `GET /functions/v1/get-events?country=BF` — skip `is_permanent`; v1 **one** `EVENT_ALLOWLIST` UUID |
| Order | RPC `guest_order_processor` **7 args** — never `p_event_date_id`. Email `{digits}@temba.temp` |
| Pay | `POST /functions/v1/create-pawapay-payment` — `provider: orange`, no `user_id`, `idempotency_key=wa-{wa_id}-{order_id}` |
| QR | After **paid + finalize**, `POST lookup-guest-tickets` `{ action: tickets, token }`. Encode **`generateQRData(ticket.id)`**, not `tickets.qr_code` |

## Notify after tickets exist

Set Edge Function secrets:

- `WHATSAPP_ADAPTER_URL` — origin of the bot (`https://….fly.dev`), no trailing path
- `WHATSAPP_ADAPTER_SECRET` — same as bot `ADAPTER_WEBHOOK_SECRET`

`finalize-order` (and the webhook sync fallback) `POST {payment_id, order_id, status}` to `{URL}/paid`. Header `x-adapter-secret`. If unset, the adapter still polls `verify-pawapay-payment` as a safety net.

Failed PawaPay: same `/paid` with `status: failed`.

## v1 product locks

Orange Money only. One Ouaga paid event first. Confirm shows face + **frais Orange Money ~3%** + total. Never trust “j’ai payé.” No Moov/card/addons/attractions/LLM until QR on that event is boring.

## Deploy reminder (not done from this doc)

```bash
supabase functions deploy finalize-order --project-ref wlyncuwbzhzjafmqozcm
supabase functions deploy pawapay-webhook --project-ref wlyncuwbzhzjafmqozcm
```

Only when you are ready. Netlify: set `WHATSAPP_WA_ME_NUMBER` then ship the site (`push code`).
