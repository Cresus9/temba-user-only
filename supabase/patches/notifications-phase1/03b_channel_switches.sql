-- Notification P1 / 03b: channel kill-switches read by notification-worker.
-- push stays off until a valid OneSignal App API key is set (current key returns 401).
INSERT INTO public.notification_settings (key, value) VALUES
  ('push_enabled', 'false'::jsonb), ('email_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
