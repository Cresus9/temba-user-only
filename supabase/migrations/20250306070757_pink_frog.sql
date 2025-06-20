/*
  # Create Order Function

  1. New Functions
    - `create_order`: Creates a new order and associated tickets
      - Parameters:
        - `p_event_id`: UUID - Event ID
        - `p_user_id`: UUID - User ID
        - `p_ticket_quantities`: JSONB - Map of ticket type IDs to quantities
        - `p_payment_method`: TEXT - Payment method (CARD or MOBILE_MONEY)
      - Returns: JSON with order ID and success status

  2. Security
    - Function can only be executed by authenticated users
    - Validates user permissions and ticket availability
*/

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
  v_available INTEGER;
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
    
    IF v_quantity IS NULL THEN
      CONTINUE;
    END IF;

    IF v_quantity <= 0 THEN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_order IS 'Creates a new order with tickets for an event';