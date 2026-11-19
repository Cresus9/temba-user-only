-- Notification P1 / 04: "commande confirmée" in-app + push when an order becomes COMPLETED.
-- New helper functions + one new AFTER trigger on orders that can never fail the order
-- (all work wrapped in an exception block; gated by notification_settings.order_confirmed_enabled).
BEGIN;

CREATE OR REPLACE FUNCTION public.notif_fr_date(p_date date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT (ARRAY['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'])[extract(dow FROM p_date)::int + 1]
         || ' ' || extract(day FROM p_date)::int
         || ' ' || (ARRAY['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month FROM p_date)::int]
$$;

CREATE OR REPLACE FUNCTION public.notif_fr_time(p_time text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_time ~ '^\s*\d{1,2}:\d{2}' THEN
    ltrim(split_part(trim(p_time), ':', 1), '0') || 'h' ||
    CASE WHEN substr(split_part(trim(p_time), ':', 2), 1, 2) = '00' THEN '' ELSE substr(split_part(trim(p_time), ':', 2), 1, 2) END
  END
$$;

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

DROP TRIGGER IF EXISTS zz_notif_order_completed ON public.orders;  -- idempotent re-run of this patch only
CREATE TRIGGER zz_notif_order_completed
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.notif_on_order_completed();
COMMIT;
