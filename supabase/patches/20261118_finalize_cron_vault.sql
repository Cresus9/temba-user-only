-- NOT APPLIED.
-- Optional: point process-finalize-jobs-every-minute at a Vault secret
-- instead of the legacy service_role JWT hardcoded in the cron command.
-- Do not paste that JWT, or the current service-role key, into this file.
--
-- Create the secret once, out of band, before running the schedule below:
--   select vault.create_secret(
--     '<service_role key>',
--     'temba_service_role_key',
--     'Temba-EU credential for process-finalize-jobs'
--   );
-- The value can be the runtime SUPABASE_SERVICE_ROLE_KEY or the legacy JWT.
-- Both are accepted by finalize auth. Anon and user tokens are not.

select cron.unschedule('process-finalize-jobs-every-minute');

select cron.schedule(
  'process-finalize-jobs-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://wlyncuwbzhzjafmqozcm.supabase.co/functions/v1/process-finalize-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'temba_service_role_key'
        limit 1
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Rollback: remove the vault-backed job, then recreate the previous schedule
-- from the Supabase dashboard. The previous command contained a credential
-- and is intentionally not stored here.
-- select cron.unschedule('process-finalize-jobs-every-minute');
