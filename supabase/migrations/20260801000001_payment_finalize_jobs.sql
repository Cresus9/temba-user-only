-- payment_finalize_jobs
-- Durable job queue for payments whose finalization (ticket creation) could
-- not be completed synchronously.  Written to by:
--   • stripe-webhook  (when inline fallback ticket creation fails)
--   • check-pawapay-status (when QStash publish AND direct RPC both fail)
-- Processed by: process-finalize-jobs (scheduled edge function)

CREATE TABLE IF NOT EXISTS payment_finalize_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid        NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider        text        NOT NULL DEFAULT 'unknown',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts        integer     NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one pending/processing job per payment at a time
CREATE UNIQUE INDEX IF NOT EXISTS payment_finalize_jobs_payment_id_active_idx
  ON payment_finalize_jobs (payment_id)
  WHERE status IN ('pending', 'processing');

-- Fast poll by status + attempts
CREATE INDEX IF NOT EXISTS payment_finalize_jobs_status_attempts_idx
  ON payment_finalize_jobs (status, attempts)
  WHERE status = 'pending';
