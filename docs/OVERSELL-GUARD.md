# Oversell guard: stock held while the buyer pays

## Problem (checked on Temba-EU, 2026-11-20)
- `create-pawapay-payment` / `create-stripe-payment` read the price and insert an
  `AWAITING_PAYMENT` order. They never check stock.
- `admin_finalize_payment` issues the billed tickets with no capacity check.
- `available` is recounted after the fact (`quantity - tickets VALID/USED`), and
  nothing stops it going below 0. Two buyers who both see the last seat both pay
  and both get a ticket.

## Fix
One rule everywhere:

    available = quantity - tickets VALID/USED - live holds

| Moment | What happens |
| --- | --- |
| Order created, before the operator or card form | `reserve_order_tickets(order)` locks the ticket types (in id order), counts, and holds the quantity for 30 min. If there's not enough stock it raises `TEMBA_SOLD_OUT` and the API returns **409 "Plus assez de billets disponibles pour ce tarif."** The order created for that request is cancelled, and nobody is charged. |
| Same order retried | The hold is kept and its expiry pushed back. It is not doubled. |
| Orange BF OTP prompt (first step) | The hold is released. The OTP step sends a new request that holds again, so a buyer can't block their own last seat. |
| pawaPay refuses the request / edge error before the provider | The hold is released at once. |
| Order → COMPLETED (`admin_finalize_payment`) | The hold is `converted` and the tickets count instead. The finalize function is **unchanged**. |
| Order → CANCELLED / FAILED / REFUNDED / EXPIRED (webhooks, safety net) | The hold is `released`. |
| Nobody finishes paying | A cron job every 5 min releases expired holds. The order itself is not touched. |
| Money arrives after the hold expired | Tickets are still issued: a paid buyer is never refused. The type can then go to -1 (visible, rare). |

Why holds and not a finalize-time check: with mobile money the buyer has already
entered their PIN by the time we finalize. A finalize-time check can only refuse
after the money has moved, which means refunds and angry buyers. Holding up front
refuses before anyone pays.

The legacy table `public.ticket_reservations` (empty; it allows public INSERT) is
not reused, so a hold can only be created by the server.

## Files
- `supabase/migrations/20261120090000_order_ticket_holds_oversell_guard.sql`
- `supabase/rollback/20261120090000_order_ticket_holds_oversell_guard.down.sql`
- `supabase/rollback/20261120090000_order_ticket_holds_oversell_guard.test.sql`
  (the patch plus a simulation; it ends with RAISE, so nothing is ever saved)
- `supabase/functions/_shared/ticketHolds.ts`, `create-pawapay-payment`, `create-stripe-payment`
- `src/services/pawapayService.ts`: shows the server sentence instead of raw JSON

Mobile app: no change. It already shows the `error` field of a non-2xx response.

## Deploy order (each step is safe on its own)
1. Migration. Existing `AWAITING_PAYMENT` orders (607, newest 2026-10-18) get no hold, so nothing changes for them.
2. Edge functions `create-pawapay-payment`, `create-stripe-payment`. If the RPC is missing, they fail open and sell exactly as today.
3. Web (tembas.com).

Rollback: edge functions first, then the `.down.sql`.

## Test run (2026-11-20, Temba-EU, single transaction aborted by RAISE)
Ticket type with quantity 3:
1. Order A holds 2: available 1.
2. Order B wants 2: refused with `TEMBA_SOLD_OUT`, French hint, detail `{requested:2, available:1}`, no hold left behind.
3. Order C holds the last 1: available 0.
4. Order A retried: `already_held`, still 2 held, available 0.
5. C cancelled: hold released, available 1.
6. A paid → `admin_finalize_payment`: success, 2 tickets, hold converted, available 1.
7. D holds 1: available 0. 8. D expires → cron release: hold released, order still AWAITING_PAYMENT, available 1.
9. B wants 2 again: refused.

Afterwards: 0 new functions, no `order_ticket_holds` table, no test rows,
`update_ticket_type_available` unchanged (md5 identical), row counts identical.

## Concurrency argument
`reserve_order_tickets` takes `SELECT … FOR UPDATE` on every ticket type of the
order in id order, then counts in a new statement. Under READ COMMITTED, that
statement sees everything committed by whoever held the lock before. A second
buyer therefore waits for the first to commit and then sees the first buyer's
hold, so two holds can never both take the same last seat. The recount
(`recompute_ticket_type_available`) uses the same lock-then-count pattern. It
also runs as SECURITY DEFINER, so RLS can't hide tickets from the count (the old
trigger ran as the caller, a likely source of the 16 drifted `available` values
found today). Each order locks its types in the same order, so there are no
deadlocks between holds.

Not run: a true two-session test. Uncommitted DDL is invisible to a second
session. Do this on staging after the migration: 50 parallel
`reserve_order_tickets` calls on a type with quantity 10 → exactly 10 succeed.

## Not covered (follow-ups)
- Per-date capacity (`event_dates.capacity`) for multi-date events.
- `sales_enabled` / `max_per_order` are still not enforced server-side (behaviour unchanged).
- Other order paths (legacy `create-payment`, free/comp tickets) don't hold stock.
