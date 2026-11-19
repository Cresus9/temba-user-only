-- Notification P1 / 01: neutralize the stale notification_queue backlog.
-- Backs up every still-pending row, then marks them cancelled (never sent).
-- Additive only: one new backup table, status/metadata updates on existing rows.
BEGIN;
CREATE TABLE IF NOT EXISTS public.notification_queue_backup_20261119 AS
  SELECT q.*, now() AS backed_up_at FROM public.notification_queue q WHERE q.status = 'pending';
ALTER TABLE public.notification_queue_backup_20261119 ENABLE ROW LEVEL SECURITY; -- service role only
REVOKE ALL ON public.notification_queue_backup_20261119 FROM anon, authenticated;

UPDATE public.notification_queue q
   SET status = 'cancelled',
       error_message = 'stale_backlog: neutralized 2026-11-19, never sent',
       metadata = coalesce(q.metadata, '{}'::jsonb) || jsonb_build_object('neutralized_at', now(), 'neutralized_reason', 'stale_backlog_pre_worker')
 WHERE q.status = 'pending'
   AND q.id IN (SELECT id FROM public.notification_queue_backup_20261119);
COMMIT;
