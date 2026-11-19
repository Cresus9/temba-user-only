-- Rollback for 08: stop push only (rows are cancelled as push_channel_disabled, nothing piles up).
UPDATE public.notification_settings SET value = 'false'::jsonb, updated_at = now() WHERE key = 'push_enabled';
