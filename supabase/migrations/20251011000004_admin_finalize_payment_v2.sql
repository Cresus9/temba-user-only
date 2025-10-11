-- =========================================================
-- Idempotent + concurrency-safe payment finalizer
-- - Locks payment & order (FOR UPDATE)
-- - Creates only missing tickets per type
-- - Batch inserts with generate_series (no row-by-row loops)
-- - Sets amount_paid from charge_amount_minor if present
-- - Safe to call multiple times / on webhook retries
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_finalize_payment(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_pay   payments%ROWTYPE;
  v_order orders%ROWTYPE;
  v_created_total bigint := 0;
  v_created_by_type jsonb := '[]'::jsonb;
  v_new_status text := 'completed';
  ticket_type_id uuid;
  qty_to_create int;
BEGIN
  -- Ensure SECURITY DEFINER resolves objects in public only
  PERFORM set_config('search_path', 'public, pg_temp', true);

  -- Lock payment row
  SELECT * INTO v_pay
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_pay.order_id IS NULL THEN
    -- We can finalize payment but cannot issue tickets
    IF v_pay.status NOT IN ('completed','succeeded') THEN
      UPDATE public.payments
      SET status = v_new_status,
          completed_at = COALESCE(completed_at, now()),
          amount_paid  = COALESCE(amount_paid,
                                   CASE WHEN charge_amount_minor IS NOT NULL
                                        THEN (charge_amount_minor::numeric / 100.0)
                                        ELSE amount END),
          updated_at   = now()
      WHERE id = p_payment_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment finalized; no order_id so no tickets created',
      'payment_id', p_payment_id,
      'tickets_created', 0
    );
  END IF;

  -- Lock order row
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_pay.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Normalize payment status to terminal, set amount_paid if missing
  IF v_pay.status NOT IN ('completed','succeeded') THEN
    UPDATE public.payments
    SET status = v_new_status,
        completed_at = COALESCE(completed_at, now()),
        amount_paid  = COALESCE(amount_paid,
                                 CASE WHEN charge_amount_minor IS NOT NULL
                                      THEN (charge_amount_minor::numeric / 100.0)
                                      ELSE amount END),
        updated_at   = now()
    WHERE id = p_payment_id;
  END IF;

  -- Move order to COMPLETED (adjust if your app expects 'paid')
  IF v_order.status IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE public.orders
    SET status = 'COMPLETED',
        updated_at = now()
    WHERE id = v_order.id;
  END IF;

  -- If no ticket_quantities, we're done
  IF v_order.ticket_quantities IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment finalized; order has no ticket_quantities',
      'payment_id', p_payment_id,
      'order_id', v_order.id,
      'tickets_created', 0
    );
  END IF;

  -- For each ticket type, compute how many are missing and insert just those
  -- We also collect a per-type creation summary into JSON
  FOR ticket_type_id, qty_to_create IN
    -- expected per type
    WITH wanted AS (
      SELECT (key::text)::uuid AS ticket_type_id,
             (value::text)::int  AS qty_wanted
      FROM jsonb_each_text(v_order.ticket_quantities)
    ),
    existing AS (
      SELECT ticket_type_id, COUNT(*)::int AS qty_existing
      FROM public.tickets
      WHERE order_id = v_order.id
      GROUP BY ticket_type_id
    ),
    todo AS (
      SELECT w.ticket_type_id,
             GREATEST(w.qty_wanted - COALESCE(e.qty_existing,0), 0) AS qty_to_create
      FROM wanted w
      LEFT JOIN existing e USING (ticket_type_id)
    )
    SELECT ticket_type_id, qty_to_create
    FROM todo
  LOOP
    IF qty_to_create > 0 THEN
      INSERT INTO public.tickets (
        order_id, event_id, user_id, ticket_type_id,
        status, payment_status, payment_id, created_at
      )
      SELECT
        v_order.id,
        v_pay.event_id,
        v_pay.user_id,
        ticket_type_id,
        'VALID',
        'paid',
        p_payment_id,
        now()
      FROM generate_series(1, qty_to_create);

      v_created_total := v_created_total + qty_to_create;
      v_created_by_type := v_created_by_type || jsonb_build_array(
        jsonb_build_object('ticket_type_id', ticket_type_id, 'created', qty_to_create)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment finalized',
    'payment_id', p_payment_id,
    'order_id', v_order.id,
    'tickets_created', v_created_total,
    'per_type', v_created_by_type
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'admin_finalize_payment error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$fn$;

-- Restrict execution (service role only)
REVOKE ALL ON FUNCTION public.admin_finalize_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finalize_payment(uuid) TO service_role;

-- Helpful index to speed delta-calculation & prevent table scans
CREATE INDEX IF NOT EXISTS idx_tickets_order_type ON public.tickets(order_id, ticket_type_id);

