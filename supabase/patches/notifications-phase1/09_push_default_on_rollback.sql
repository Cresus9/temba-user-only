-- Rollback for 09_push_default_on.sql. Restores prior push values from the backup
-- and leaves the column default at true (that was already the live default).
BEGIN;

UPDATE public.notification_preferences p
SET push = b.push
FROM public.notification_preferences_push_backup_20261119 b
WHERE p.user_id = b.user_id;

DROP TABLE IF EXISTS public.notification_preferences_push_backup_20261119;

COMMIT;
