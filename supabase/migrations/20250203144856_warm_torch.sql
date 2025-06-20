CREATE OR REPLACE FUNCTION create_order(
  p_event_id UUID,
  p_user_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
  v_available INTEGER;
  v_quantity INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Create order
    INSERT INTO orders (
      event_id,
      user_id,
      total,
      status,
      payment_method
    ) VALUES (
      p_event_id,
      p_user_id,
      0, -- Will update this later
      'PENDING',
      p_payment_method
    ) RETURNING id INTO v_order_id;

    -- Process each ticket type
    FOR v_ticket_type IN 
      SELECT tt.id, tt.price, tt.available, tt.max_per_order
      FROM ticket_types tt
      WHERE tt.event_id = p_event_id
      FOR UPDATE
    LOOP
      -- Get requested quantity
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RAISE EXCEPTION 'Not enough tickets available';
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RAISE EXCEPTION 'Exceeds maximum tickets per order';
      END IF;

      -- Create tickets
      INSERT INTO tickets (
        order_id,
        event_id,
        user_id,
        ticket_type_id,
        status,
        qr_code
      )
      SELECT
        v_order_id,
        p_event_id,
        p_user_id,
        v_ticket_type.id,
        'VALID',
        encode(gen_random_bytes(32), 'hex')
      FROM generate_series(1, v_quantity);

      -- Update available tickets
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    -- Update order total
    UPDATE orders
    SET total = v_total + (v_total * 0.02) -- Add 2% processing fee
    WHERE id = v_order_id;

    -- Update event tickets sold count
    UPDATE events
    SET tickets_sold = tickets_sold + (
      SELECT COUNT(*)
      FROM tickets
      WHERE order_id = v_order_id
    )
    WHERE id = p_event_id;

    RETURN v_order_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;