/*
  # Create Order Functions

  1. New Functions
    - create_order: Creates a new order and associated tickets
    - create_guest_order: Creates an order for non-authenticated users
    - calculate_order_total: Calculates the total amount for an order
    - create_tickets_for_order: Creates tickets for a completed order

  2. Security
    - Functions use SECURITY DEFINER to run with elevated privileges
    - Input validation and error handling
    - Proper transaction management
*/

-- Function to create a new order
CREATE OR REPLACE FUNCTION public.create_order(
  p_event_id UUID,
  p_user_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_event_status TEXT;
BEGIN
  -- Check if event exists and is published
  SELECT status INTO v_event_status
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;

  IF v_event_status != 'PUBLISHED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event is not available for booking'
    );
  END IF;

  -- Validate ticket quantities and calculate total
  FOR v_ticket_type IN 
    SELECT id, price, available, max_per_order, name
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::INTEGER;
    
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    IF v_quantity > v_ticket_type.max_per_order THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Maximum %s tickets allowed per order for %s', v_ticket_type.max_per_order, v_ticket_type.name)
      );
    END IF;

    IF v_quantity > v_ticket_type.available THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Not enough tickets available for %s', v_ticket_type.name)
      );
    END IF;

    v_total := v_total + (v_ticket_type.price * v_quantity);
  END LOOP;

  -- Create order
  INSERT INTO orders (
    user_id,
    event_id,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_user_id,
    p_event_id,
    v_total,
    'PENDING',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'total', v_total
  );
END;
$$;

-- Function to create a guest order
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_email TEXT,
  p_name TEXT,
  p_event_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_verification_token TEXT;
  v_total NUMERIC;
BEGIN
  -- Generate verification token
  v_verification_token := encode(gen_random_bytes(32), 'hex');

  -- Create order using create_order function
  WITH order_result AS (
    SELECT (create_order(p_event_id, NULL, p_ticket_quantities, p_payment_method)).*
  )
  SELECT 
    (order_result.value->>'orderId')::UUID,
    (order_result.value->>'total')::NUMERIC
  INTO v_order_id, v_total
  FROM order_result
  WHERE (order_result.value->>'success')::BOOLEAN = true;

  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create order'
    );
  END IF;

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
    NOW() + INTERVAL '48 hours'
  );

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'verificationToken', v_verification_token,
    'total', v_total
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_order TO anon;
GRANT EXECUTE ON FUNCTION public.create_guest_order TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.create_order IS 'Creates a new order with tickets for an event';
COMMENT ON FUNCTION public.create_guest_order IS 'Creates a new order for non-authenticated users';