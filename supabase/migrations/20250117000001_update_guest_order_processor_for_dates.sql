/*
  # Update guest_order_processor to support event dates

  Changes:
    - Add p_event_date_id parameter to guest_order_processor function
    - Include event_date_id when creating orders
*/

CREATE OR REPLACE FUNCTION guest_order_processor(
  p_email text,
  p_name text,
  p_phone text,
  p_event_id uuid,
  p_payment_method text,
  p_ticket_quantities jsonb,
  p_payment_details jsonb DEFAULT '{}'::jsonb,
  p_event_date_id uuid DEFAULT NULL
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
    event_date_id,
    visible_in_history
  ) VALUES (
    p_event_id,
    p_email,
    p_payment_method,
    'AWAITING_PAYMENT',
    v_total,
    p_ticket_quantities,
    p_event_date_id,
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

