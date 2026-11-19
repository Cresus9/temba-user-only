-- Notification P1 / 08: turn on push (valid OneSignal App API key set on Temba-EU 2026-11-19).
UPDATE public.notification_settings SET value = 'true'::jsonb, updated_at = now() WHERE key = 'push_enabled';
