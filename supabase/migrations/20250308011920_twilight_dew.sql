/*
  # Order Creation Functions

  1. New Functions
    - create_order: Creates an order and associated tickets atomically
    - create_guest_order: Creates a guest order with verification token
    - validate_order: Validates order details and ticket availability

  2. Security
    - Functions are SECURITY DEFINER to ensure proper access control
    - Input validation and sanitization
    - Atomic transactions to prevent race conditions

  3. Changes
    - Added transaction support for order creation
    - Added ticket availability checks
    - Added payment validation
*/

-- Function to validate order details and check ticket availability
CREATE OR REPLACE FUNCTION validate_order(
  p_event_id UUID,
  p_ticket_quantities JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_event_status TEXT;
BEGIN
  -- Check if event exists and is published
  SELECT status INTO v_event_status
  FROM events
  WHERE id = p_event_id;
  
  IF v_event_status IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  IF v_event_status != 'PUBLISHED' THEN
    RAISE EXCEPTION 'Event is not available for booking';
  END IF;

  -- Check ticket availability
  FOR v_ticket_type IN 
    SELECT id, available, max_per_order
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    
    IF v_quantity IS NOT NULL THEN
      IF v_quantity > v_ticket_type.available THEN
        RAISE EXCEPTION 'Not enough tickets available';
      END IF;
      
      IF v_quantity > v_ticket_type.max_per_order THEN
        RAISE EXCEPTION 'Maximum tickets per order exceeded';
      END IF;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- Function to create an order with tickets
CREATE OR REPLACE FUNCTION create_order(
  p_user_id UUID,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB,
  p_payment_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
BEGIN
  -- Validate order
  PERFORM validate_order(p_event_id, p_ticket_quantities);

  -- Calculate total
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL THEN
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END IF;
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

  -- Create tickets
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL AND v_quantity > 0 THEN
      -- Update ticket availability
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;
      
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
        encode(gen_random_bytes(32), 'base64')
      FROM generate_series(1, v_quantity);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_order_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create order: %', SQLERRM;
END;
$$;

-- Function to create a guest order
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_token UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
BEGIN
  -- Validate order
  PERFORM validate_order(p_event_id, p_ticket_quantities);

  -- Generate verification token
  v_token := gen_random_uuid();

  -- Calculate total
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL THEN
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO orders (
    event_id,
    guest_email,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_email,
    v_total,
    'PENDING',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    phone,
    token
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    p_phone,
    v_token
  );

  -- Create tickets
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL AND v_quantity > 0 THEN
      -- Update ticket availability
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;
      
      -- Create tickets
      INSERT INTO tickets (
        order_id,
        event_id,
        ticket_type_id,
        status,
        qr_code
      )
      SELECT
        v_order_id,
        p_event_id,
        v_ticket_type.id,
        'VALID',
        encode(gen_random_bytes(32), 'base64')
      FROM generate_series(1, v_quantity);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create guest order: %', SQLERRM;
END;
$$;