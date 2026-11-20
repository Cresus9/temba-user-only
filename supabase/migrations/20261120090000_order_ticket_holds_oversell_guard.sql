-- Oversell guard: hold stock while the buyer pays.
--
-- create-pawapay-payment / create-stripe-payment call reserve_order_tickets(order_id)
-- right after the AWAITING_PAYMENT order exists and BEFORE the provider is called.
-- If there is not enough stock the RPC raises TEMBA_SOLD_OUT and nobody is charged.
--
-- Stock rule (one formula everywhere):
--   available = quantity
--             - tickets VALID/USED of the type
--             - active, unexpired reservations of the type
--
-- Holds end when the order turns COMPLETED (converted: tickets now count instead),
-- CANCELLED/FAILED/REFUNDED/EXPIRED (released), or after the TTL (cron, every 5 min).
-- A buyer who pays after their hold expired still gets tickets: admin_finalize_payment
-- is not changed and never refuses a paid order.
--
-- Existing AWAITING_PAYMENT orders get no reservation: nothing changes for them.
-- Note: public.ticket_reservations (legacy reserve_tickets / free-ticket helpers) already
-- exists, is empty, and lets the public INSERT rows, so it is NOT used here: a hold
-- must only be creatable by the server.
--
-- Rollback: supabase/rollback/20261120090000_order_ticket_holds_oversell_guard.down.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_ticket_holds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quantity       integer NOT NULL CHECK (quantity > 0),
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'converted', 'released')),
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, ticket_type_id)
);

CREATE INDEX IF NOT EXISTS order_ticket_holds_active_type_idx
  ON public.order_ticket_holds (ticket_type_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS order_ticket_holds_active_expiry_idx
  ON public.order_ticket_holds (expires_at) WHERE status = 'active';

-- Server-only table: RLS on, no policies, no grants to app roles.
ALTER TABLE public.order_ticket_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_ticket_holds FROM anon, authenticated;

-- Recount one ticket type. Locks the row first, so the counts (taken in the next
-- statement, with a fresh snapshot) include every change committed before us.
-- SECURITY DEFINER so RLS on tickets / reservations never hides rows from the count
-- (the old trigger ran as the caller).
CREATE OR REPLACE FUNCTION public.recompute_ticket_type_available(p_ticket_type_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_ticket_type_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1 FROM public.ticket_types WHERE id = p_ticket_type_id FOR UPDATE;

  UPDATE public.ticket_types tt
  SET available = tt.quantity
      - (SELECT COUNT(*) FROM public.tickets k
          WHERE k.ticket_type_id = p_ticket_type_id
            AND k.status IN ('VALID', 'USED'))
      - (SELECT COALESCE(SUM(r.quantity), 0) FROM public.order_ticket_holds r
          WHERE r.ticket_type_id = p_ticket_type_id
            AND r.status = 'active'
            AND r.expires_at > now())
  WHERE tt.id = p_ticket_type_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_ticket_type_available(uuid) FROM PUBLIC, anon, authenticated;

-- Same trigger, same tickets events; the formula now also subtracts live holds.
CREATE OR REPLACE FUNCTION public.update_ticket_type_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_ticket_type_available(NEW.ticket_type_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_ticket_type_available(OLD.ticket_type_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.ticket_type_id IS DISTINCT FROM NEW.ticket_type_id THEN
      PERFORM public.recompute_ticket_type_available(OLD.ticket_type_id);
    END IF;
    PERFORM public.recompute_ticket_type_available(NEW.ticket_type_id);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Hold stock for one order. Atomic: either every ticket type of the order is held,
-- or the call raises and nothing is held. Idempotent per order (retries, OTP second
-- attempt): an existing live hold is extended, not doubled.
CREATE OR REPLACE FUNCTION public.reserve_order_tickets(
  p_order_id uuid,
  p_ttl_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order    public.orders%ROWTYPE;
  v_line     record;
  v_type     record;
  v_sold     integer;
  v_held     integer;
  v_left     integer;
  v_expires  timestamptz := now() + make_interval(mins => GREATEST(COALESCE(p_ttl_minutes, 30), 1));
  v_out      jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEMBA_ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status = 'COMPLETED' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'order_completed');
  END IF;

  IF v_order.ticket_quantities IS NULL OR jsonb_typeof(v_order.ticket_quantities) <> 'object' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_ticket_quantities');
  END IF;

  -- Retry of the same order: keep the hold, push the expiry.
  IF EXISTS (SELECT 1 FROM public.order_ticket_holds
             WHERE order_id = p_order_id AND status = 'active' AND expires_at > now()) THEN
    UPDATE public.order_ticket_holds
    SET expires_at = GREATEST(expires_at, v_expires), updated_at = now()
    WHERE order_id = p_order_id AND status = 'active';
    RETURN jsonb_build_object('ok', true, 'already_held', true, 'expires_at', v_expires);
  END IF;

  -- Ticket types in id order: every caller locks in the same order (no deadlock).
  FOR v_line IN
    SELECT (key)::uuid AS ticket_type_id, SUM((value)::int)::int AS qty
    FROM jsonb_each_text(v_order.ticket_quantities)
    WHERE key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND value ~ '^[0-9]{1,4}$'
      AND (value)::int > 0
    GROUP BY 1
    ORDER BY 1
  LOOP
    SELECT id, name, quantity INTO v_type
    FROM public.ticket_types
    WHERE id = v_line.ticket_type_id AND event_id = v_order.event_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEMBA_TICKET_TYPE_NOT_FOUND' USING ERRCODE = 'P0002',
        DETAIL = v_line.ticket_type_id::text;
    END IF;

    -- Counted after the lock: fresh snapshot, so concurrent buyers are visible.
    SELECT COUNT(*)::int INTO v_sold
    FROM public.tickets
    WHERE ticket_type_id = v_line.ticket_type_id AND status IN ('VALID', 'USED');

    SELECT COALESCE(SUM(quantity), 0)::int INTO v_held
    FROM public.order_ticket_holds
    WHERE ticket_type_id = v_line.ticket_type_id
      AND status = 'active'
      AND expires_at > now()
      AND order_id <> p_order_id;

    v_left := COALESCE(v_type.quantity, 0) - v_sold - v_held;

    IF v_left < v_line.qty THEN
      RAISE EXCEPTION 'TEMBA_SOLD_OUT' USING ERRCODE = 'P0001',
        DETAIL = jsonb_build_object(
          'ticket_type_id', v_line.ticket_type_id,
          'ticket_type_name', v_type.name,
          'requested', v_line.qty,
          'available', GREATEST(v_left, 0)
        )::text,
        HINT = 'Plus assez de billets disponibles pour ce tarif.';
    END IF;

    INSERT INTO public.order_ticket_holds (order_id, ticket_type_id, quantity, status, expires_at)
    VALUES (p_order_id, v_line.ticket_type_id, v_line.qty, 'active', v_expires)
    ON CONFLICT (order_id, ticket_type_id) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          status = 'active',
          expires_at = EXCLUDED.expires_at,
          updated_at = now();

    UPDATE public.ticket_types SET available = v_left - v_line.qty WHERE id = v_line.ticket_type_id;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'ticket_type_id', v_line.ticket_type_id, 'held', v_line.qty, 'left', v_left - v_line.qty));
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'expires_at', v_expires, 'held', v_out);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_order_tickets(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_tickets(uuid, integer) TO service_role;

-- Give back the hold of one order without touching the order (provider refused the
-- payment request before any money moved, or the edge function failed after holding).
CREATE OR REPLACE FUNCTION public.release_order_ticket_holds(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tt uuid;
  v_n  integer := 0;
BEGIN
  FOR v_tt IN
    WITH changed AS (
      UPDATE public.order_ticket_holds
      SET status = 'released', updated_at = now()
      WHERE order_id = p_order_id AND status = 'active'
      RETURNING ticket_type_id
    )
    SELECT DISTINCT ticket_type_id FROM changed ORDER BY 1
  LOOP
    PERFORM public.recompute_ticket_type_available(v_tt);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.release_order_ticket_holds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_order_ticket_holds(uuid) TO service_role;

-- Order status change ends the hold.
CREATE OR REPLACE FUNCTION public.order_ticket_holds_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_state text;
  v_tt uuid;
BEGIN
  IF NEW.status = 'COMPLETED' THEN
    v_new_state := 'converted';
  ELSIF NEW.status IN ('CANCELLED', 'FAILED', 'REFUNDED', 'EXPIRED') THEN
    v_new_state := 'released';
  ELSE
    RETURN NEW;
  END IF;

  FOR v_tt IN
    WITH changed AS (
      UPDATE public.order_ticket_holds
      SET status = v_new_state, updated_at = now()
      WHERE order_id = NEW.id AND status = 'active'
      RETURNING ticket_type_id
    )
    SELECT DISTINCT ticket_type_id FROM changed ORDER BY 1
  LOOP
    PERFORM public.recompute_ticket_type_available(v_tt);
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.order_ticket_holds_on_order_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_order_ticket_holds_on_order_status ON public.orders;
CREATE TRIGGER zz_order_ticket_holds_on_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.order_ticket_holds_on_order_status();

-- Expired holds (buyer never finished paying). The order itself is left alone:
-- if the money arrives later, admin_finalize_payment still issues the tickets.
CREATE OR REPLACE FUNCTION public.release_expired_order_ticket_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tt uuid;
  v_n  integer := 0;
BEGIN
  FOR v_tt IN
    WITH changed AS (
      UPDATE public.order_ticket_holds
      SET status = 'released', updated_at = now()
      WHERE status = 'active' AND expires_at <= now()
      RETURNING ticket_type_id
    )
    SELECT DISTINCT ticket_type_id FROM changed ORDER BY 1
  LOOP
    PERFORM public.recompute_ticket_type_available(v_tt);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_order_ticket_holds() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Cron (outside the transaction; pg_cron is already installed and running 6 jobs).
SELECT cron.schedule(
  'release-expired-order-ticket-holds',
  '*/5 * * * *',
  $$SELECT public.release_expired_order_ticket_holds();$$
);
