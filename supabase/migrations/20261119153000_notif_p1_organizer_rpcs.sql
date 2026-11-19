-- Notification P1 / 07a: organizer-safe RPCs (additive). Applied before the admin portal switches to them.
BEGIN;
-- Scan confirmation for the ticket holder. Caller: admin, or the organizer of the ticket's event.
CREATE OR REPLACE FUNCTION public.notif_ticket_scanned(p_ticket_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t record; v_name text; v_title text; v_id uuid;
BEGIN
  SELECT tk.id, tk.user_id, tk.status, tk.scanned_at, tk.scan_location, e.title AS event_title, e.organizer_id
    INTO t
    FROM tickets tk JOIN events e ON e.id = tk.event_id
   WHERE tk.id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found' USING ERRCODE = 'P0002'; END IF;
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT coalesce(public.is_admin(auth.uid()), false)
     AND t.organizer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF t.user_id IS NULL OR t.status <> 'USED' THEN RETURN NULL; END IF;
  SELECT name INTO v_name FROM profiles WHERE user_id = t.user_id;
  v_title := coalesce(nullif(trim(t.event_title), ''), 'votre événement');
  v_id := notif_enqueue(
    t.user_id, 'ticket_scanned', 'Billet scanné - ' || v_title,
    'Bonjour ' || coalesce(nullif(trim(v_name), ''), 'à vous') || ', votre billet pour ' || v_title
      || ' a bien été scanné' || coalesce(' à ' || nullif(trim(t.scan_location), ''), '') || '. Profitez bien !',
    '/profile/my-tickets', 'Voir mon billet',
    jsonb_build_object('ticket_id', t.id, 'scanned_at', t.scanned_at),
    ARRAY['in_app'], 'ticket_scanned:' || t.id::text, 'normal', now(), NULL);
  RETURN v_id;
END $$;

-- Organizer message to selected attendees of one event. Only users holding a ticket for that event receive it.
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
