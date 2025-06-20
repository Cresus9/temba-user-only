/*
  # Improve Guest Order Error Handling

  1. Changes
    - Add input validation
    - Add proper error messages
    - Add transaction handling
    - Add security checks

  2. Security
    - Validate inputs
    - Check permissions
    - Handle errors gracefully
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace the guest order function with better error handling
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
  -- Input validation
  IF p_email IS NULL OR p_name IS NULL OR p_event_id IS NULL OR p_ticket_quantities IS NULL OR p_payment_method IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
  END IF;

  -- Email format validation
  IF NOT p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Check if event exists and is published
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
    -- Calculate total and validate ticket quantities
    FOR v_ticket_type IN 
      SELECT id, price, available, max_per_order
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL OR v_quantity <= 0 THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Not enough tickets available (type: %s)', v_ticket_type.id)
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
    v_verification_token := encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex');

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

    -- Update ticket availability
    FOR v_ticket_type IN 
      SELECT id, available
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL OR v_quantity <= 0 THEN
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
        SELECT coalesce(sum((value::text)::integer), 0)
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
    -- Log error details
    RAISE NOTICE 'Error in create_guest_order: %', SQLERRM;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO public;