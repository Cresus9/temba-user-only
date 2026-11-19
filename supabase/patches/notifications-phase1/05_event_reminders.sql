-- Notification P1 / 05: event reminders 24h and 2h before, per ticket holder and per visit date
-- (multi-date events use tickets.event_date_id -> event_dates.date/start_time).
-- 24h: in-app + push + email (email only to real addresses, enforced by the worker).
-- 2h : in-app + push.
-- Generator runs every 10 minutes from pg_cron; gated by notification_settings.reminders_enabled.
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
COMMIT;

SELECT cron.schedule('notification-event-reminders-every-10-min', '*/10 * * * *',
  $job$ SELECT public.notif_enqueue_event_reminders(); $job$);
