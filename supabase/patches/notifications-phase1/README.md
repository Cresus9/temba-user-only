# Notifications — Phase 1 (applied to Temba-EU on 2026-11-19)

Applied in this order with the Management API SQL endpoint. Every patch has a `*_rollback.sql`.

| # | Patch | What it does |
|---|-------|--------------|
| 01 | `01_neutralize_stale_queue.sql` | Backed up 1,497 never-sent pending queue rows to `notification_queue_backup_20261119`, then marked them `cancelled` (nothing sent). |
| 02 | `02_preferences_caps_settings.sql` | New preference columns (in_app, sms, event_reminders, order_updates, quiet hours, timezone, daily caps), queue idempotency columns, `notification_settings`. |
| 03 | `03_worker_rpcs.sql` | `notif_enqueue`, `notif_claim_batch`, `notif_complete`; `queue_notification_delivery` now admin/service-only. |
| 03b | `03b_channel_switches.sql` | `push_enabled` (off until the OneSignal App API key is valid) and `email_enabled`. |
| 03c | `03c_worker_cron.sql` | pg_cron `notification-worker-every-minute` → edge function `notification-worker` (secret from Vault). |
| 04 | `04_order_confirmed.sql` | Trigger `zz_notif_order_completed` on orders → "Commande confirmée" in-app + push. Never fails the order. |
| 05 | `05_event_reminders.sql` | `notif_enqueue_event_reminders()` + pg_cron `notification-event-reminders-every-10-min` (24h and 2h, per visit date). |
| 06 | `06_go_live.sql` | worker_mode=live, cutover_at=now (only rows created after go-live are ever sent). |
| 07a | `07a_organizer_rpcs.sql` | `notif_ticket_scanned(ticket)` and `notif_message_attendees(event, users, message)` — admin or the event's organizer only (Temba-admin #56 uses them). |
| 07b | `07b_lockdown_inbox_inserts.sql` | Signed-in users can no longer insert into anyone's inbox (policy now admins only); `create_notification_from_template` admin/server only; `mark_notifications_read` own inbox only (or admin). |
| 08 | `08_enable_push.sql` | push_enabled=true after a valid OneSignal App API key was set as `ONESIGNAL_REST_API_KEY`. |

Kill switch (stops all sending, keeps rows): `06_go_live_rollback.sql`.

Settings (`public.notification_settings`, service role only): `worker_mode` (off | test_only | live), `dry_run`,
`cutover_at`, `test_user_ids`, `push_enabled`, `email_enabled`, `reminders_enabled`, `order_confirmed_enabled`, `batch_size`.

Rules enforced by the worker (`supabase/functions/notification-worker/policy.ts`, unit tests in `policy_test.ts`):
- never email `@temba.temp` addresses; honour per-user push/email switches;
- daily caps (push 4, email 3 by default) and quiet hours 22h–7h local for non-transactional messages (deferred, or dropped if the event has started);
- idempotent: dedupe keys in SQL, row locking (`FOR UPDATE SKIP LOCKED`), and provider idempotency keys (queue row id) for OneSignal and Resend.
