-- Notification P1.5 / 09: push is on by default; backfill untouched default-off rows.
-- NOT APPLIED. Do not run until an explicit "apply".
--
-- Rule: a row was never set by the user when updated_at is identical to created_at.
-- There is no updated_at trigger on notification_preferences; the app and site
-- always write a new updated_at when the user saves Profil > Notifications.
-- As of 2026-11-19 ~18:00 America/New_York: 1,181 push=false, of which 1,177
-- match this rule and are flipped; 4 later-updated rows are left false.
-- All 1,181 prior false values are copied to
-- notification_preferences_push_backup_20261119 first.

BEGIN;

ALTER TABLE public.notification_preferences
  ALTER COLUMN push SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  BEGIN
    INSERT INTO notification_preferences (user_id, email, push, types)
    VALUES (
      NEW.user_id,
      true,
      true,
      ARRAY['orders'::text, 'events'::text, 'tickets'::text, 'promotions'::text, 'support'::text, 'payouts'::text, 'security'::text, 'account'::text]
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification preferences for user %: %', NEW.user_id, SQLERRM;
  END;
  RETURN NEW;
END
$function$;

CREATE TABLE IF NOT EXISTS public.notification_preferences_push_backup_20261119 (
  user_id uuid PRIMARY KEY,
  push boolean,
  created_at timestamptz,
  updated_at timestamptz,
  untouched_default boolean NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.notification_preferences_push_backup_20261119
  (user_id, push, created_at, updated_at, untouched_default)
SELECT
  user_id,
  push,
  created_at,
  updated_at,
  (updated_at IS NOT DISTINCT FROM created_at)
FROM public.notification_preferences
WHERE push = false
ON CONFLICT (user_id) DO NOTHING;

-- Only flip rows the user never saved. Leave updated_at alone so the
-- "untouched" signal is preserved.
UPDATE public.notification_preferences p
SET push = true
FROM public.notification_preferences_push_backup_20261119 b
WHERE p.user_id = b.user_id
  AND b.untouched_default
  AND p.push = false;

COMMIT;
