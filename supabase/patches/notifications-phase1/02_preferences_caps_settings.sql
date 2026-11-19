-- Notification P1 / 02: per-user preferences (channels + reminders), quiet hours, frequency caps,
-- queue columns for idempotency/locking, and a service-only settings table.
-- Additive only (ADD COLUMN IF NOT EXISTS with defaults, new table, new indexes).
BEGIN;

-- 1. Preferences: new channel/type toggles with sane defaults. Existing email/push values untouched.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS in_app            boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms               boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_reminders   boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_updates     boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS quiet_hours_end   smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS timezone          text     NOT NULL DEFAULT 'Africa/Ouagadougou',
  ADD COLUMN IF NOT EXISTS max_push_per_day  smallint NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_email_per_day smallint NOT NULL DEFAULT 3;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_quiet_hours_chk') THEN
    ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_quiet_hours_chk
      CHECK (quiet_hours_start BETWEEN 0 AND 23 AND quiet_hours_end BETWEEN 0 AND 23) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_caps_chk') THEN
    ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_caps_chk
      CHECK (max_push_per_day BETWEEN 0 AND 20 AND max_email_per_day BETWEEN 0 AND 20) NOT VALID;
  END IF;
END $$;

-- 2. Queue: idempotency + locking + bookkeeping columns.
ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS user_id             uuid,
  ADD COLUMN IF NOT EXISTS dedupe_key          text,
  ADD COLUMN IF NOT EXISTS locked_at           timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS notification_queue_dedupe_key_uidx
  ON public.notification_queue (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_queue_pending_due_idx
  ON public.notification_queue (scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS notification_queue_user_sent_idx
  ON public.notification_queue (user_id, delivery_method, sent_at) WHERE status = 'sent';

-- 3. Settings (service role only: RLS on, no policies for anon/authenticated).
CREATE TABLE IF NOT EXISTS public.notification_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_settings FROM anon, authenticated;

INSERT INTO public.notification_settings (key, value) VALUES
  ('worker_mode',       '"off"'::jsonb),            -- off | test_only | live
  ('dry_run',           'true'::jsonb),             -- true = never call OneSignal/Resend
  ('cutover_at',        to_jsonb(now())),           -- worker ignores rows created before this
  ('test_user_ids',     '[]'::jsonb),
  ('reminders_enabled', 'false'::jsonb),
  ('order_confirmed_enabled', 'false'::jsonb),
  ('batch_size',        '50'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Effective preferences (defaults for users without a row).
CREATE OR REPLACE FUNCTION public.notif_effective_prefs(p_user_id uuid)
RETURNS TABLE (email boolean, push boolean, in_app boolean, sms boolean, event_reminders boolean,
               order_updates boolean, quiet_hours_start smallint, quiet_hours_end smallint,
               timezone text, max_push_per_day smallint, max_email_per_day smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(p.email, true), coalesce(p.push, true), coalesce(p.in_app, true), coalesce(p.sms, false),
         coalesce(p.event_reminders, true), coalesce(p.order_updates, true),
         coalesce(p.quiet_hours_start, 22::smallint), coalesce(p.quiet_hours_end, 7::smallint),
         coalesce(p.timezone, 'Africa/Ouagadougou'),
         coalesce(p.max_push_per_day, 4::smallint), coalesce(p.max_email_per_day, 3::smallint)
  FROM (SELECT 1) one LEFT JOIN public.notification_preferences p ON p.user_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.notif_effective_prefs(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notif_effective_prefs(uuid) TO service_role;

COMMIT;
