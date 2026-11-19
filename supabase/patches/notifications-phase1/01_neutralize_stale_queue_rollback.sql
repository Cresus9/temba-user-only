-- Rollback for 01: restore the original pending status/error/metadata from the backup table.
BEGIN;
UPDATE public.notification_queue q
   SET status = b.status, error_message = b.error_message, metadata = b.metadata
  FROM public.notification_queue_backup_20261119 b
 WHERE b.id = q.id AND q.status = 'cancelled' AND q.error_message LIKE 'stale_backlog:%';
COMMIT;
-- (backup table left in place on purpose; drop manually only once no longer needed)
