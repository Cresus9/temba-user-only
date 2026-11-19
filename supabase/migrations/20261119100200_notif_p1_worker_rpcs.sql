-- Notification P1 / 03: queue worker RPCs (claim/complete), enqueue helper, hardened legacy queue RPC.
-- New functions only, plus CREATE OR REPLACE of queue_notification_delivery (same signature, adds an auth guard + user_id).
BEGIN;

CREATE OR REPLACE FUNCTION public.notif_setting(p_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.notification_settings WHERE key = p_key
$$;

-- Enqueue: one in-app notification + delivery rows, deduplicated by p_dedupe_base.
-- Returns the notification id, or NULL when it already existed / user opted out of this type.
CREATE OR REPLACE FUNCTION public.notif_enqueue(
  p_user_id uuid, p_kind text, p_title text, p_message text,
  p_action_url text DEFAULT NULL, p_action_text text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_channels text[] DEFAULT ARRAY['in_app','push'],
  p_dedupe_base text DEFAULT NULL, p_priority text DEFAULT 'normal',
  p_scheduled_for timestamptz DEFAULT now(), p_expires_at timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefs record; v_nid uuid; v_ch text; v_meta jsonb; v_anchor text;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  v_anchor := coalesce(p_dedupe_base, 'adhoc:' || gen_random_uuid()::text);
  IF EXISTS (SELECT 1 FROM notification_queue WHERE dedupe_key = v_anchor || ':in_app') THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_prefs FROM notif_effective_prefs(p_user_id);
  IF p_kind LIKE 'event_reminder%' AND NOT v_prefs.event_reminders THEN RETURN NULL; END IF;
  IF p_kind = 'order_confirmed' AND NOT v_prefs.order_updates THEN RETURN NULL; END IF;

  v_meta := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('kind', p_kind, 'dedupe_base', v_anchor, 'source', 'notif_p1')
            || CASE WHEN p_expires_at IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('expires_at', p_expires_at) END;

  INSERT INTO notifications (user_id, title, message, type, priority, action_url, action_text, metadata, expires_at)
  VALUES (p_user_id, p_title, p_message, p_kind, p_priority, p_action_url, p_action_text, v_meta, NULL)
  RETURNING id INTO v_nid;

  -- Anchor row: the in-app copy is delivered the moment the notification row exists.
  INSERT INTO notification_queue (notification_id, user_id, delivery_method, status, scheduled_for, sent_at, processed_at, dedupe_key, metadata)
  VALUES (v_nid, p_user_id, 'in_app', 'sent', now(), now(), now(), v_anchor || ':in_app', v_meta)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  IF NOT FOUND THEN
    -- Lost a race with a concurrent enqueue: drop our duplicate in-app row.
    DELETE FROM notifications WHERE id = v_nid;
    RETURN NULL;
  END IF;

  FOREACH v_ch IN ARRAY p_channels LOOP
    CONTINUE WHEN v_ch = 'in_app' OR v_ch NOT IN ('push','email');
    INSERT INTO notification_queue (notification_id, user_id, delivery_method, status, scheduled_for, dedupe_key, metadata)
    VALUES (v_nid, p_user_id, v_ch, 'pending', coalesce(p_scheduled_for, now()), v_anchor || ':' || v_ch, v_meta)
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END LOOP;
  RETURN v_nid;
END $$;

-- Claim a batch of due deliveries (row-locked, skip-locked) with everything the worker needs.
CREATE OR REPLACE FUNCTION public.notif_claim_batch(p_limit int DEFAULT 50)
RETURNS TABLE (queue_id uuid, notification_id uuid, delivery_method text, user_id uuid, retry_count int, max_retries int,
               title text, message text, action_url text, priority text, metadata jsonb, email text,
               prefs jsonb, push_sent_24h int, email_sent_24h int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode text := coalesce(notif_setting('worker_mode') #>> '{}', 'off');
  v_cutover timestamptz := coalesce((notif_setting('cutover_at') #>> '{}')::timestamptz, now());
  v_tests jsonb := coalesce(notif_setting('test_user_ids'), '[]'::jsonb);
BEGIN
  IF v_mode NOT IN ('test_only','live') THEN RETURN; END IF;
  RETURN QUERY
  WITH picked AS (
    SELECT q.id FROM notification_queue q
    LEFT JOIN notifications n0 ON n0.id = q.notification_id
    WHERE q.status = 'pending'
      AND q.scheduled_for <= now()
      AND q.created_at >= v_cutover
      AND (q.locked_at IS NULL OR q.locked_at < now() - interval '10 minutes')
      AND (v_mode = 'live' OR v_tests ? coalesce(q.user_id, n0.user_id)::text)
    ORDER BY q.scheduled_for
    LIMIT greatest(1, least(p_limit, 200))
    FOR UPDATE OF q SKIP LOCKED
  ), locked AS (
    UPDATE notification_queue q SET locked_at = now()
    FROM picked WHERE q.id = picked.id
    RETURNING q.*
  )
  SELECT l.id, l.notification_id, l.delivery_method, coalesce(l.user_id, n.user_id), l.retry_count, l.max_retries,
         n.title, n.message, n.action_url, n.priority,
         coalesce(n.metadata, '{}'::jsonb) || coalesce(l.metadata, '{}'::jsonb),
         u.email::text,
         (SELECT to_jsonb(p) FROM notif_effective_prefs(coalesce(l.user_id, n.user_id)) p),
         (SELECT count(*)::int FROM notification_queue s WHERE s.user_id = coalesce(l.user_id, n.user_id) AND s.delivery_method = 'push'  AND s.status = 'sent' AND s.sent_at > now() - interval '24 hours'),
         (SELECT count(*)::int FROM notification_queue s WHERE s.user_id = coalesce(l.user_id, n.user_id) AND s.delivery_method = 'email' AND s.status = 'sent' AND s.sent_at > now() - interval '24 hours')
  FROM locked l
  LEFT JOIN notifications n ON n.id = l.notification_id
  LEFT JOIN auth.users u ON u.id = coalesce(l.user_id, n.user_id);
END $$;

-- Complete one claimed delivery. Only touches rows still pending (idempotent).
-- p_status: sent | failed | cancelled | retry | defer   (retry/defer keep it pending until p_next_at)
CREATE OR REPLACE FUNCTION public.notif_complete(p_queue_id uuid, p_status text, p_error text DEFAULT NULL,
  p_provider_id text DEFAULT NULL, p_meta jsonb DEFAULT '{}'::jsonb, p_next_at timestamptz DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status IN ('retry','defer') THEN
    UPDATE notification_queue SET
      scheduled_for = coalesce(p_next_at, now() + interval '5 minutes'), locked_at = NULL,
      retry_count = retry_count + CASE WHEN p_status = 'retry' THEN 1 ELSE 0 END,
      error_message = p_error, metadata = coalesce(metadata,'{}'::jsonb) || coalesce(p_meta,'{}'::jsonb)
    WHERE id = p_queue_id AND status = 'pending';
  ELSIF p_status IN ('sent','failed','cancelled') THEN
    UPDATE notification_queue SET
      status = p_status, sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      processed_at = now(), locked_at = NULL, error_message = p_error, provider_message_id = p_provider_id,
      metadata = coalesce(metadata,'{}'::jsonb) || coalesce(p_meta,'{}'::jsonb)
    WHERE id = p_queue_id AND status = 'pending';
  ELSE
    RAISE EXCEPTION 'bad status %', p_status;
  END IF;
  RETURN FOUND;
END $$;

-- Harden the legacy admin RPC: only admins / service role / direct SQL may queue deliveries; record user_id.
CREATE OR REPLACE FUNCTION public.queue_notification_delivery(p_notification_id uuid, p_delivery_methods text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  method text; v_user uuid;
BEGIN
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT coalesce(public.is_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT user_id INTO v_user FROM notifications WHERE id = p_notification_id;
  FOREACH method IN ARRAY p_delivery_methods LOOP
    INSERT INTO notification_queue (notification_id, user_id, delivery_method, status, scheduled_for, sent_at, processed_at)
    VALUES (p_notification_id, v_user, method,
            CASE WHEN method = 'in_app' THEN 'sent' ELSE 'pending' END, now(),
            CASE WHEN method = 'in_app' THEN now() END, CASE WHEN method = 'in_app' THEN now() END);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.notif_setting(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notif_enqueue(uuid,text,text,text,text,text,jsonb,text[],text,text,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notif_claim_batch(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notif_complete(uuid,text,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notif_setting(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notif_enqueue(uuid,text,text,text,text,text,jsonb,text[],text,text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.notif_claim_batch(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.notif_complete(uuid,text,text,text,jsonb,timestamptz) TO service_role;
COMMIT;
