-- Drop existing function
DROP FUNCTION IF EXISTS create_guest_order;

-- Create improved guest order function with proper order creation
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email text,
  p_name text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_verification_token text;
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
  v_available INTEGER;
  v_quantity INTEGER;
BEGIN
  -- Generate verification token using md5 and random values
  v_verification_token := md5(
    p_email || 
    p_event_id::text || 
    random()::text || 
    clock_timestamp()::text
  );

  -- Verify event exists and is published
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = p_event_id 
    AND status = 'PUBLISHED'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or not available'
    );
  END IF;

  -- Create order directly (not using create_order function)
  INSERT INTO orders (
    event_id,
    guest_email, -- Use guest_email instead of user_id
    total,
    status,
    payment_method
  ) VALUES (
    p_event_id,
    p_email,
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
    v_quantity := COALESCE((p_ticket_quantities->>(v_ticket_type.id::text))::integer, 0);
    
    IF v_quantity = 0 THEN
      CONTINUE;
    END IF;

    -- Validate quantity
    IF v_quantity > v_ticket_type.available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Not enough tickets available for type %s', v_ticket_type.id)
      );
    END IF;

    IF v_quantity > v_ticket_type.max_per_order THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Maximum %s tickets allowed per order for type %s', 
          v_ticket_type.max_per_order, v_ticket_type.id)
      );
    END IF;

    -- Create tickets
    FOR i IN 1..v_quantity LOOP
      INSERT INTO tickets (
        order_id,
        event_id,
        user_id, -- This will be NULL for guest orders
        ticket_type_id,
        status,
        qr_code
      ) VALUES (
        v_order_id,
        p_event_id,
        NULL, -- No user_id for guest tickets
        v_ticket_type.id,
        'VALID',
        md5(v_order_id::text || v_ticket_type.id::text || random()::text || clock_timestamp()::text)
      );
    END LOOP;

    -- Update available tickets
    UPDATE ticket_types
    SET available = available - v_quantity
    WHERE id = v_ticket_type.id;

    -- Add to total
    v_total := v_total + (v_ticket_type.price * v_quantity);
  END LOOP;

  -- Update order total with processing fee
  UPDATE orders
  SET 
    total = v_total + (v_total * 0.02), -- Add 2% processing fee
    updated_at = now()
  WHERE id = v_order_id;

  -- Update event tickets sold count
  UPDATE events
  SET 
    tickets_sold = tickets_sold + (
      SELECT COUNT(*)
      FROM tickets
      WHERE order_id = v_order_id
    ),
    updated_at = now()
  WHERE id = p_event_id;

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    verification_token,
    token_expires_at
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    v_verification_token,
    now() + interval '48 hours'
  );

  -- Return success response with verification token
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'verificationToken', v_verification_token,
    'expiresAt', (now() + interval '48 hours')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO authenticated;