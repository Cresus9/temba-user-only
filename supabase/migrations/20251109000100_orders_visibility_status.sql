-- =====================================================
-- Orders visibility & status normalization
-- =====================================================

-- 1) Add visibility flag (default false)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS visible_in_history BOOLEAN NOT NULL DEFAULT false;

-- 2) Normalize legacy statuses
UPDATE public.orders SET status = 'AWAITING_PAYMENT' WHERE status = 'PENDING';
UPDATE public.orders SET status = 'CANCELLED' WHERE status = 'FAILED';

-- 3) Normalize legacy statuses before enforcing new constraint
--    Map old interim values to the new canonical set
UPDATE public.orders SET status = 'AWAITING_PAYMENT'
WHERE status IN ('PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION');

UPDATE public.orders SET status = 'CANCELLED'
WHERE status IN ('FAILED', 'REFUNDED', 'ABANDONED', 'CANCELLED_MANUAL');

-- Any status we still don't understand becomes CANCELLED so the constraint succeeds
UPDATE public.orders
SET status = 'CANCELLED'
WHERE status NOT IN ('AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- 4) Make historical completed / cancelled orders visible
UPDATE public.orders
SET visible_in_history = true
WHERE status IN ('COMPLETED', 'CANCELLED');

-- 5) Refresh status constraint to allow new states
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

-- 6) Guest order processor should create hidden, awaiting orders
CREATE OR REPLACE FUNCTION guest_order_processor(
  p_email text,
  p_name text,
  p_phone text,
  p_event_id uuid,
  p_payment_method text,
  p_ticket_quantities jsonb,
  p_payment_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_token uuid;
  v_total numeric;
  v_ticket_type RECORD;
BEGIN
  -- Validate email
  IF NOT p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Calculate total
  v_total := 0;
  FOR v_ticket_type IN 
    SELECT tt.*, (q.value)::integer as qty
    FROM jsonb_each_text(p_ticket_quantities) q
    JOIN ticket_types tt ON tt.id = q.key::uuid
  LOOP
    IF v_ticket_type.qty <= 0 THEN
      CONTINUE;
    END IF;

    IF v_ticket_type.available < v_ticket_type.qty THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Not enough tickets available for type %s', v_ticket_type.id)
      );
    END IF;

    v_total := v_total + (v_ticket_type.price * v_ticket_type.qty);
  END LOOP;

  -- Create order hidden until payment succeeds
  INSERT INTO orders (
    event_id,
    guest_email,
    payment_method,
    status,
    total,
    ticket_quantities,
    visible_in_history
  ) VALUES (
    p_event_id,
    p_email,
    p_payment_method,
    'AWAITING_PAYMENT',
    v_total,
    p_ticket_quantities,
    false
  ) RETURNING id INTO v_order_id;

  -- Create guest order metadata
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    phone
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    p_phone
  ) RETURNING token INTO v_token;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Cleanup function uses new status
CREATE OR REPLACE FUNCTION cleanup_expired_guest_orders()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM orders
  WHERE guest_email IS NOT NULL
    AND status = 'AWAITING_PAYMENT'
    AND created_at < now() - interval '48 hours';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7) Ensure admin_finalize_payment marks orders visible when completed
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
  PERFORM set_config('search_path', 'public, pg_temp', true);

  SELECT * INTO v_pay
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_pay.order_id IS NULL THEN
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

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_pay.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

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

  IF v_order.status IS DISTINCT FROM 'COMPLETED' OR v_order.visible_in_history IS DISTINCT FROM true THEN
    UPDATE public.orders
    SET status = 'COMPLETED',
        visible_in_history = true,
        updated_at = now()
    WHERE id = v_order.id;
  END IF;

  IF v_order.ticket_quantities IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment finalized; order has no ticket_quantities',
      'payment_id', p_payment_id,
      'order_id', v_order.id,
      'tickets_created', 0
    );
  END IF;

  FOR ticket_type_id, qty_to_create IN
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

REVOKE ALL ON FUNCTION public.admin_finalize_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finalize_payment(uuid) TO service_role;


