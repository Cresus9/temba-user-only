-- Rollback for 02. Run only if 03-05 are rolled back first (they depend on these objects).
-- Dropping the added columns removes only data created by this phase.
BEGIN;
DROP FUNCTION IF EXISTS public.notif_effective_prefs(uuid);
DROP TABLE IF EXISTS public.notification_settings;
DROP INDEX IF EXISTS public.notification_queue_dedupe_key_uidx;
DROP INDEX IF EXISTS public.notification_queue_pending_due_idx;
DROP INDEX IF EXISTS public.notification_queue_user_sent_idx;
ALTER TABLE public.notification_queue
  DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS dedupe_key, DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS processed_at, DROP COLUMN IF EXISTS provider_message_id;
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_quiet_hours_chk,
  DROP CONSTRAINT IF EXISTS notification_preferences_caps_chk,
  DROP COLUMN IF EXISTS in_app, DROP COLUMN IF EXISTS sms, DROP COLUMN IF EXISTS event_reminders,
  DROP COLUMN IF EXISTS order_updates, DROP COLUMN IF EXISTS quiet_hours_start, DROP COLUMN IF EXISTS quiet_hours_end,
  DROP COLUMN IF EXISTS timezone, DROP COLUMN IF EXISTS max_push_per_day, DROP COLUMN IF EXISTS max_email_per_day;
COMMIT;
