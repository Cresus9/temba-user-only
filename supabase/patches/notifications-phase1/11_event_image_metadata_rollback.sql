-- Rollback for 11_event_image_metadata.sql.
-- Restores the previous function bodies (no image_url in metadata).
-- Does not touch cron jobs.
-- DO NOT APPLY until explicitly approved.
BEGIN;

CREATE OR REPLACE FUNCTION public.notif_enqueue_event_reminders()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v24 int := 0; v2 int := 0; v_title text; v_msg text; v_when text; v_id uuid;
BEGIN
  IF coalesce(notif_setting('reminders_enabled'), 'false'::jsonb) <> 'true'::jsonb THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  FOR r IN
    WITH occ AS (
      SELECT DISTINCT ON (t.user_id, t.event_id, coalesce(ed.date, e.date))
             t.user_id, t.event_id, e.title, coalesce(v.name, nullif(e.venue, ''), e.location) AS place,
             coalesce(ed.date, e.date) AS occ_date,
             coalesce(nullif(ed.start_time, ''), e.time) AS occ_time,
             coalesce(nullif(e.timezone, ''), 'Africa/Ouagadougou') AS tz,
             t.event_date_id, min(t.created_at) OVER (PARTITION BY t.user_id, t.event_id, coalesce(ed.date, e.date)) AS first_ticket_at
        FROM tickets t
        JOIN events e ON e.id = t.event_id
        LEFT JOIN event_dates ed ON ed.id = t.event_date_id
        LEFT JOIN venues v ON v.id = e.venue_id
       WHERE t.status IN ('VALID', 'ACTIVE')
         AND t.user_id IS NOT NULL
         AND e.deleted_at IS NULL
         AND upper(coalesce(e.status, '')) NOT IN ('CANCELLED', 'CANCELED', 'DRAFT', 'REJECTED')
         AND coalesce(ed.status, 'active') NOT IN ('cancelled', 'CANCELLED')
         AND NOT (coalesce(e.is_permanent, false) AND t.event_date_id IS NULL)   -- open-dated attraction tickets: no visit date
         AND coalesce(ed.date, e.date) BETWEEN current_date - 1 AND current_date + 2
         AND coalesce(nullif(ed.start_time, ''), e.time) ~ '^\s*\d{1,2}:\d{2}'
       ORDER BY t.user_id, t.event_id, coalesce(ed.date, e.date), t.created_at
    )
    SELECT occ.*, ((occ.occ_date + substring(trim(occ.occ_time) FROM '^\d{1,2}:\d{2}')::time) AT TIME ZONE occ.tz) AS starts_at
      FROM occ
  LOOP
    v_when := notif_fr_time(r.occ_time);
    -- 24h window: [start-24h, start-12h), ticket held for at least 1h
    IF now() >= r.starts_at - interval '24 hours' AND now() < r.starts_at - interval '12 hours'
       AND r.first_ticket_at < now() - interval '1 hour' THEN
      v_title := CASE WHEN (now() AT TIME ZONE r.tz)::date = r.occ_date THEN 'C''est aujourd''hui : ' ELSE 'C''est demain : ' END || r.title;
      v_msg := CASE WHEN (now() AT TIME ZONE r.tz)::date = r.occ_date THEN 'Rendez-vous aujourd''hui à ' ELSE 'Rendez-vous demain à ' END
               || v_when || coalesce(' · ' || nullif(trim(r.place), ''), '')
               || '. Vos billets sont dans Mes billets, prêts à être scannés à l''entrée.';
      v_id := notif_enqueue(r.user_id, 'event_reminder_24h', v_title, v_msg, '/profile/my-tickets', 'Voir mes billets',
                jsonb_build_object('event_id', r.event_id, 'event_date_id', r.event_date_id, 'occurrence_date', r.occ_date,
                                   'starts_at', r.starts_at, 'cta_label', 'Voir mes billets',
                                   'email_subject', 'Rappel : ' || r.title || ', ' || CASE WHEN (now() AT TIME ZONE r.tz)::date = r.occ_date THEN 'aujourd''hui' ELSE 'demain' END || ' à ' || v_when),
                ARRAY['in_app','push','email'],
                'reminder24:' || r.user_id || ':' || r.event_id || ':' || r.occ_date, 'normal', now(), r.starts_at);
      IF v_id IS NOT NULL THEN v24 := v24 + 1; END IF;
    END IF;
    -- 2h window: [start-2h, start-30min), ticket held for at least 30 min
    IF now() >= r.starts_at - interval '2 hours' AND now() < r.starts_at - interval '30 minutes'
       AND r.first_ticket_at < now() - interval '30 minutes' THEN
      v_title := 'C''est bientôt : ' || r.title;
      v_msg := r.title || ' commence aujourd''hui à ' || v_when || coalesce(' · ' || nullif(trim(r.place), ''), '')
               || '. Gardez votre billet à portée de main.';
      v_id := notif_enqueue(r.user_id, 'event_reminder_2h', v_title, v_msg, '/profile/my-tickets', 'Voir mes billets',
                jsonb_build_object('event_id', r.event_id, 'event_date_id', r.event_date_id, 'occurrence_date', r.occ_date,
                                   'starts_at', r.starts_at, 'cta_label', 'Voir mes billets'),
                ARRAY['in_app','push'],
                'reminder2:' || r.user_id || ':' || r.event_id || ':' || r.occ_date, 'high', now(), r.starts_at);
      IF v_id IS NOT NULL THEN v2 := v2 + 1; END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('enabled', true, 'created_24h', v24, 'created_2h', v2);
END $$;
REVOKE ALL ON FUNCTION public.notif_enqueue_event_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notif_enqueue_event_reminders() TO service_role;


CREATE OR REPLACE FUNCTION public.notif_on_order_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text; v_date date; v_msg text;
BEGIN
  BEGIN
    IF NEW.user_id IS NULL OR coalesce(notif_setting('order_confirmed_enabled'), 'false'::jsonb) <> 'true'::jsonb THEN
      RETURN NEW;
    END IF;
    SELECT e.title, coalesce(ed.date, CASE WHEN coalesce(e.is_permanent, false) THEN NULL ELSE e.date END)
      INTO v_title, v_date
      FROM events e LEFT JOIN event_dates ed ON ed.id = NEW.event_date_id
     WHERE e.id = NEW.event_id;
    v_title := coalesce(nullif(trim(v_title), ''), 'votre événement');
    v_msg := 'Vos billets pour ' || v_title
             || CASE WHEN v_date IS NOT NULL THEN ' (' || notif_fr_date(v_date) || ')' ELSE '' END
             || ' sont prêts. Retrouvez-les dans Mes billets.';
    PERFORM notif_enqueue(
      NEW.user_id, 'order_confirmed', 'Commande confirmée', v_msg,
      '/profile/my-tickets', 'Voir mes billets',
      jsonb_build_object('order_id', NEW.id, 'event_id', NEW.event_id, 'event_date_id', NEW.event_date_id, 'cta_label', 'Voir mes billets'),
      ARRAY['in_app','push'], 'order_confirmed:' || NEW.id::text, 'high', now(), now() + interval '2 days');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notif_on_order_completed skipped for order %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notif_on_order_completed() FROM PUBLIC, anon, authenticated;


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


CREATE OR REPLACE FUNCTION public.notif_message_attendees(p_event_id uuid, p_user_ids uuid[], p_message text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record; v_count integer;
BEGIN
  SELECT id, title, organizer_id INTO e FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002'; END IF;
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT coalesce(public.is_admin(auth.uid()), false)
     AND e.organizer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 OR length(p_message) > 2000 THEN
    RAISE EXCEPTION 'invalid message' USING ERRCODE = '22023';
  END IF;
  INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
  SELECT DISTINCT tk.user_id, 'Message de ' || e.title, trim(p_message), 'info', 'normal', '/events/' || e.id,
         jsonb_build_object('event_id', e.id, 'from', 'organizer', 'sent_by', auth.uid())
    FROM tickets tk
   WHERE tk.event_id = e.id AND tk.user_id = ANY(p_user_ids) AND tk.user_id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.notif_ticket_scanned(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notif_message_attendees(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notif_ticket_scanned(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notif_message_attendees(uuid, uuid[], text) TO authenticated, service_role;


COMMIT;
