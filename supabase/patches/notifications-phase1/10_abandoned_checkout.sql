-- Notification P1.5 / 10: abandoned-checkout reminders (in-app + push after 45 minutes).
-- NOT APPLIED. Do not run until an explicit "apply".
--
-- Records a started checkout for a signed-in user, including the case where no
-- order row exists yet (the payment screen was opened and left).
-- A pg_cron job every 5 minutes enqueues reminders that are due; completing an
-- order cancels any still-pending queue rows. Copy is informal-polite French
-- (vous) and never calls a price of 0 "Gratuit".
-- Quiet hours and daily caps already apply: abandoned_checkout is not in the
-- worker's TRANSACTIONAL_KINDS, so no worker redeploy is required.

BEGIN;

INSERT INTO public.notification_settings (key, value) VALUES
  ('abandoned_checkout_enabled', 'true'::jsonb),
  ('abandoned_checkout_delay_minutes', '45'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.abandoned_checkouts
  ADD COLUMN IF NOT EXISTS event_date_id uuid,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS resume_path text;

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_open_user_event
  ON public.abandoned_checkouts (user_id, event_id, created_at)
  WHERE completed = false;

-- Logged-in buyer records (or refreshes) a started checkout. Does not reset
-- created_at, so opening the payment screen again does not postpone the reminder.
CREATE OR REPLACE FUNCTION public.notif_record_checkout_start(
  p_event_id uuid,
  p_event_date_id uuid DEFAULT NULL,
  p_ticket_selections jsonb DEFAULT '{}'::jsonb,
  p_total_amount numeric DEFAULT NULL,
  p_resume_path text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_event uuid;
BEGIN
  IF v_uid IS NULL OR p_event_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT e.id INTO v_event FROM events e WHERE e.id = p_event_id;
  IF v_event IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ac.id INTO v_id
  FROM abandoned_checkouts ac
  WHERE ac.user_id = v_uid
    AND ac.event_id = p_event_id
    AND ac.completed = false
    AND ac.event_date_id IS NOT DISTINCT FROM p_event_date_id
  ORDER BY ac.created_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE abandoned_checkouts
    SET ticket_selections = coalesce(p_ticket_selections, ticket_selections),
        total_amount = coalesce(p_total_amount, total_amount),
        resume_path = coalesce(nullif(trim(p_resume_path), ''), resume_path),
        source = coalesce(nullif(trim(p_source), ''), source),
        updated_at = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO abandoned_checkouts (
    user_id, event_id, event_date_id, ticket_selections, total_amount,
    reminder_sent, completed, source, resume_path
  ) VALUES (
    v_uid, p_event_id, p_event_date_id, coalesce(p_ticket_selections, '{}'::jsonb),
    p_total_amount, false, false, nullif(trim(p_source), ''), nullif(trim(p_resume_path), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notif_record_checkout_start skipped: %', SQLERRM;
  RETURN NULL;
END
$$;

REVOKE ALL ON FUNCTION public.notif_record_checkout_start(uuid, uuid, jsonb, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notif_record_checkout_start(uuid, uuid, jsonb, numeric, text, text) TO authenticated, service_role;

-- Mark matching open checkouts completed and cancel pending reminder deliveries.
CREATE OR REPLACE FUNCTION public.notif_complete_abandoned_checkouts(
  p_user_id uuid,
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_user_id IS NULL OR p_event_id IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT id
    FROM abandoned_checkouts
    WHERE user_id = p_user_id
      AND event_id = p_event_id
      AND completed = false
  LOOP
    UPDATE abandoned_checkouts
    SET completed = true, updated_at = now()
    WHERE id = r.id AND completed = false;

    UPDATE notification_queue
    SET status = 'cancelled',
        error_message = 'checkout_completed',
        processed_at = now(),
        locked_at = NULL
    WHERE status = 'pending'
      AND dedupe_key LIKE ('abandoned_checkout:' || r.id::text || ':%');
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notif_complete_abandoned_checkouts skipped: %', SQLERRM;
END
$$;

REVOKE ALL ON FUNCTION public.notif_complete_abandoned_checkouts(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notif_on_order_completed_cancel_abandon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.user_id IS NOT NULL AND NEW.event_id IS NOT NULL THEN
      PERFORM notif_complete_abandoned_checkouts(NEW.user_id, NEW.event_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notif_on_order_completed_cancel_abandon skipped for order %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.notif_on_order_completed_cancel_abandon() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_notif_abandon_on_order_completed ON public.orders;
CREATE TRIGGER zz_notif_abandon_on_order_completed
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION notif_on_order_completed_cancel_abandon();

-- Drain due started checkouts into the existing notification queue.
CREATE OR REPLACE FUNCTION public.notif_enqueue_abandoned_checkouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delay int;
  v_title text;
  v_slug text;
  v_msg text;
  v_path text;
  v_prefs record;
  n int := 0;
  r record;
BEGIN
  IF coalesce(notif_setting('abandoned_checkout_enabled'), 'true'::jsonb) <> 'true'::jsonb THEN
    RETURN 0;
  END IF;
  v_delay := coalesce((notif_setting('abandoned_checkout_delay_minutes') #>> '{}')::int, 45);
  IF v_delay < 5 THEN v_delay := 5; END IF;
  IF v_delay > 24 * 60 THEN v_delay := 24 * 60; END IF;

  FOR r IN
    SELECT ac.id, ac.user_id, ac.event_id, ac.resume_path
    FROM abandoned_checkouts ac
    WHERE ac.completed = false
      AND ac.reminder_sent = false
      AND ac.user_id IS NOT NULL
      AND ac.event_id IS NOT NULL
      AND ac.created_at <= now() - make_interval(mins => v_delay)
    ORDER BY ac.created_at
    LIMIT 200
  LOOP
    BEGIN
      -- Skip if a completed order already exists for this user and event
      -- (covers orders that finished before this job ran).
      IF EXISTS (
        SELECT 1 FROM orders o
        WHERE o.user_id = r.user_id
          AND o.event_id = r.event_id
          AND o.status = 'COMPLETED'
          AND o.created_at >= (SELECT ac2.created_at - interval '1 day' FROM abandoned_checkouts ac2 WHERE ac2.id = r.id)
      ) THEN
        PERFORM notif_complete_abandoned_checkouts(r.user_id, r.event_id);
        CONTINUE;
      END IF;

      SELECT * INTO v_prefs FROM notif_effective_prefs(r.user_id);
      IF v_prefs IS NULL OR NOT v_prefs.order_updates THEN
        UPDATE abandoned_checkouts
        SET reminder_sent = true, reminder_sent_at = now(), updated_at = now()
        WHERE id = r.id AND reminder_sent = false;
        CONTINUE;
      END IF;

      SELECT e.title, e.slug INTO v_title, v_slug
      FROM events e WHERE e.id = r.event_id;
      v_title := coalesce(nullif(trim(v_title), ''), 'votre événement');
      v_path := coalesce(nullif(trim(r.resume_path), ''), '/e/' || coalesce(nullif(trim(v_slug), ''), r.event_id::text));
      v_msg := 'Vous avez commencé à réserver des billets pour « ' || v_title
               || ' ». Finalisez votre commande pour les recevoir.';

      PERFORM notif_enqueue(
        r.user_id,
        'abandoned_checkout',
        'Vos billets vous attendent',
        v_msg,
        v_path,
        'Reprendre ma commande',
        jsonb_build_object(
          'checkout_id', r.id,
          'event_id', r.event_id,
          'cta_label', 'Reprendre ma commande'
        ),
        ARRAY['in_app','push'],
        'abandoned_checkout:' || r.id::text,
        'normal',
        now(),
        now() + interval '2 days'
      );

      UPDATE abandoned_checkouts
      SET reminder_sent = true, reminder_sent_at = now(), updated_at = now()
      WHERE id = r.id AND reminder_sent = false;
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notif_enqueue_abandoned_checkouts skipped %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END
$$;

REVOKE ALL ON FUNCTION public.notif_enqueue_abandoned_checkouts() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'notification-abandoned-checkout-every-5-min';

SELECT cron.schedule(
  'notification-abandoned-checkout-every-5-min',
  '*/5 * * * *',
  $job$ SELECT public.notif_enqueue_abandoned_checkouts(); $job$
);

COMMIT;
