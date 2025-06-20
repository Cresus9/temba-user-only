/*
  # Fix Guest Order Token Generation

  1. Changes
    - Enable pgcrypto extension for secure token generation
    - Simplify token generation to use gen_random_uuid() and encode()
    - Add proper error handling

  2. Security
    - Use cryptographically secure functions
    - Add proper access control
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_guest_token();
DROP FUNCTION IF EXISTS create_guest_order(text, text, uuid, jsonb, text);
DROP FUNCTION IF EXISTS verify_guest_access(text);

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_guest_token() 
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
BEGIN
  -- Generate a random token using UUID and timestamp
  v_token := encode(
    sha256(
      (gen_random_uuid()::text || now()::text)::bytea
    ),
    'hex'
  );
  
  RETURN v_token;
END;
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
  -- Validate inputs
  IF p_email IS NULL OR p_name IS NULL OR p_event_id IS NULL OR p_ticket_quantities IS NULL OR p_payment_method IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
  END IF;

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
      
      IF v_quantity IS NULL OR v_quantity <= 0 THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RAISE EXCEPTION 'Not enough tickets available (type: %)', v_ticket_type.id;
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RAISE EXCEPTION 'Maximum % tickets allowed per order', v_ticket_type.max_per_order;
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
  -- Validate input
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid token'
    );
  END IF;

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

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in verify_guest_access: %', SQLERRM;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO public;
GRANT EXECUTE ON FUNCTION verify_guest_access TO public;
GRANT EXECUTE ON FUNCTION generate_guest_token TO public;

-- Verify functions exist and extension is enabled
DO $$
BEGIN
  -- Verify pgcrypto extension
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension is not enabled';
  END IF;

  -- Verify functions
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'generate_guest_token'
  ) THEN
    RAISE EXCEPTION 'Function generate_guest_token does not exist';
  END IF;
END $$;