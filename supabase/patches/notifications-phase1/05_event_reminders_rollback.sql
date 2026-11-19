-- Rollback for 05 (fast kill-switch alternative: UPDATE notification_settings SET value='false' WHERE key='reminders_enabled').
SELECT cron.unschedule('notification-event-reminders-every-10-min');
DROP FUNCTION IF EXISTS public.notif_enqueue_event_reminders();
