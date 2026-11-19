-- Rollback for 06: stop all sending immediately (queue rows stay pending, nothing is lost).
UPDATE public.notification_settings SET value = '"off"'::jsonb, updated_at = now() WHERE key = 'worker_mode';
UPDATE public.notification_settings SET value = 'false'::jsonb, updated_at = now() WHERE key IN ('reminders_enabled', 'order_confirmed_enabled');
