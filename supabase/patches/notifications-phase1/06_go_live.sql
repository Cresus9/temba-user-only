-- Notification P1 / 06: switch the worker to live for rows created from now on; enable reminders.
UPDATE public.notification_settings SET value = to_jsonb(now()), updated_at = now() WHERE key = 'cutover_at';
UPDATE public.notification_settings SET value = '"live"'::jsonb, updated_at = now() WHERE key = 'worker_mode';
UPDATE public.notification_settings SET value = 'false'::jsonb, updated_at = now() WHERE key = 'dry_run';
UPDATE public.notification_settings SET value = 'true'::jsonb,  updated_at = now() WHERE key IN ('reminders_enabled', 'order_confirmed_enabled');
