-- Notification P1 / 03c: pg_cron job that calls notification-worker every minute.
-- Secret is read from Vault at run time (never stored in the job text).
SELECT cron.schedule(
  'notification-worker-every-minute',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://wlyncuwbzhzjafmqozcm.supabase.co/functions/v1/notification-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notification_worker_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);
