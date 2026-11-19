-- Rollback for 10_abandoned_checkout.sql. Stops the cron and drops new
-- functions, trigger and columns. Leaves any already-recorded checkout rows
-- and any already-sent reminders in place (they are not unsent).
BEGIN;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'notification-abandoned-checkout-every-5-min';

DROP TRIGGER IF EXISTS zz_notif_abandon_on_order_completed ON public.orders;
DROP FUNCTION IF EXISTS public.notif_on_order_completed_cancel_abandon();
DROP FUNCTION IF EXISTS public.notif_enqueue_abandoned_checkouts();
DROP FUNCTION IF EXISTS public.notif_complete_abandoned_checkouts(uuid, uuid);
DROP FUNCTION IF EXISTS public.notif_record_checkout_start(uuid, uuid, jsonb, numeric, text, text);

DELETE FROM public.notification_settings
WHERE key IN ('abandoned_checkout_enabled', 'abandoned_checkout_delay_minutes');

DROP INDEX IF EXISTS public.idx_abandoned_checkouts_open_user_event;

ALTER TABLE public.abandoned_checkouts
  DROP COLUMN IF EXISTS resume_path,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS event_date_id;

COMMIT;
