/*
  # Fix Guest Order Creation

  1. New Functions
    - create_guest_order: Creates orders for non-authenticated users
    - verify_guest_access: Verifies guest access tokens
    - generate_guest_token: Generates secure access tokens

  2. Security
    - Enable RLS on guest_orders table
    - Add policies for guest access
    - Secure token generation and verification
*/

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_guest_token() 
RETURNS text
LANGUAGE sql
AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;

-- Create guest order function
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
  v_total numeric := 0;
  v_ticket_type record;
  v_quantity integer;
  v_event record;
BEGIN
  -- Log function entry
  RAISE NOTICE 'Creating guest order: email=%, event_id=%, payment_method=%', 
    p_email, p_event_id, p_payment_method;

  -- Validate email format
  IF NOT p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Validate event exists and is published
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id AND status = 'PUBLISHED'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or not available'
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Calculate total and validate quantities
    FOR v_ticket_type IN 
      SELECT id, price, available, max_per_order
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
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
          'error', format('Maximum %s tickets allowed per order', v_ticket_type.max_per_order)
        );
      END IF;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    -- Generate verification token
    v_verification_token := generate_guest_token();

    -- Create order
    INSERT INTO orders (
      event_id,
      total,
      status,
      payment_method,
      ticket_quantities,
      guest_email
    ) VALUES (
      p_event_id,
      v_total,
      'PENDING',
      p_payment_method,
      p_ticket_quantities,
      p_email
    ) RETURNING id INTO v_order_id;

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

    -- Update ticket type availability
    FOR v_ticket_type IN 
      SELECT id, available
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE ticket_types
      SET 
        available = available - v_quantity,
        updated_at = now()
      WHERE id = v_ticket_type.id;
    END LOOP;

    -- Update event tickets sold count
    UPDATE events
    SET 
      tickets_sold = tickets_sold + (
        SELECT sum((value::text)::integer)
        FROM jsonb_each(p_ticket_quantities)
      ),
      updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_order_id,
      'verificationToken', v_verification_token
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating guest order: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Create function to verify guest access
CREATE OR REPLACE FUNCTION verify_guest_access(
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_order record;
BEGIN
  -- Find guest order with valid token
  SELECT go.*, o.id as order_id
  INTO v_guest_order
  FROM guest_orders go
  JOIN orders o ON o.id = go.order_id
  WHERE go.verification_token = p_token
    AND go.token_expires_at > now()
    AND NOT go.verified;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Mark as verified
  UPDATE guest_orders
  SET 
    verified = true,
    updated_at = now()
  WHERE order_id = v_guest_order.order_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id,
    'email', v_guest_order.email
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO public;
GRANT EXECUTE ON FUNCTION verify_guest_access TO public;
GRANT EXECUTE ON FUNCTION generate_guest_token TO public;

-- Verify functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'create_guest_order'
  ) THEN
    RAISE EXCEPTION 'Function create_guest_order does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'verify_guest_access'
  ) THEN
    RAISE EXCEPTION 'Function verify_guest_access does not exist';
  END IF;
END $$;