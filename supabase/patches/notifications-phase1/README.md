# Notifications — Phase 1.5 patches (not applied)

These patches sit on top of Phase 1, which is already live on Temba-EU. They are **not applied**. Apply only after an explicit "apply", in this order, via the Management API SQL endpoint (same path as Phase 1). Every file has a matching `*_rollback.sql`.

| # | Patch | What it does |
|---|-------|--------------|
| 09 | `09_push_default_on.sql` | Keeps `notification_preferences.push` default true, backs up every current `push=false` row, then sets `push=true` only where the row was never edited by the user (`updated_at` is identical to `created_at`). There is no `updated_at` trigger, and the settings screens always write a new `updated_at` on save, so that rule is the audit trail. |
| 10 | `10_abandoned_checkout.sql` | Logged-in started checkouts (including before an order exists) are recorded; after 45 minutes a French in-app + push reminder is enqueued with `notif_enqueue`; completing an order cancels the pending reminder. Honours `order_updates`, quiet hours and daily caps. |

Counts on Temba-EU as of 19 Nov 2026, ~6:00 PM America/New_York (read-only, before any apply):

- 1,256 preference rows in total
- 75 already `push=true`
- 1,181 `push=false`
- **1,177** of those have `updated_at = created_at` (never saved by the user) — patch 09 flips only these
- **4** `push=false` rows were updated later (one 46 seconds after insert, three on a later day). Those are left off, in case the user saved the switch themselves.

Kill switch for reminders only: set `abandoned_checkout_enabled` to false, or run `10_abandoned_checkout_rollback.sql`. Patch 09 rollback restores `push` from `notification_preferences_push_backup_20261119`.
