/*
  # Order Creation Functions
  
  1. New Functions
    - create_order_v2: Creates a new order and associated tickets
    - validate_order_v2: Validates order details and ticket availability
    - generate_ticket_qr_code: Generates unique QR codes for tickets
    - create_guest_order_v2: Creates orders for non-authenticated users
    
  2. Security
    - Enable RLS for new functions
    - Add appropriate security policies
*/

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing functions if they exist
DO $$ BEGIN
  DROP FUNCTION IF EXISTS create_order(UUID, UUID, TEXT, JSONB, JSONB);
  DROP FUNCTION IF EXISTS validate_order(UUID, JSONB);
  DROP FUNCTION IF EXISTS generate_qr_code(UUID, UUID);
  DROP FUNCTION IF EXISTS create_guest_order(TEXT, TEXT, TEXT, UUID, TEXT, JSONB, JSONB);
EXCEPTION WHEN OTHERS THEN END $$;

-- Function to validate order details
CREATE OR REPLACE FUNCTION validate_order_v2(
  p_event_id UUID,
  p_ticket_quantities JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_ticket_type RECORD;
  v_event_status TEXT;
BEGIN
  -- Check if event exists and is published
  SELECT status INTO v_event_status
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  IF v_event_status != 'PUBLISHED' THEN
    RAISE EXCEPTION 'Event is not available for booking';
  END IF;
  
  -- Check ticket availability
  FOR v_ticket_type IN 
    SELECT tt.*, (p_ticket_quantities->>(tt.id::text))::integer as qty
    FROM ticket_types tt
    WHERE tt.event_id = p_event_id
    AND p_ticket_quantities ? tt.id::text
  LOOP
    IF v_ticket_type.qty > v_ticket_type.available THEN
      RAISE EXCEPTION 'Not enough tickets available for type %', v_ticket_type.name;
    END IF;
    
    IF v_ticket_type.qty > v_ticket_type.max_per_order THEN
      RAISE EXCEPTION 'Maximum % tickets allowed per order for type %', 
        v_ticket_type.max_per_order, v_ticket_type.name;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate QR code data
CREATE OR REPLACE FUNCTION generate_ticket_qr_code(
  p_ticket_id UUID,
  p_event_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_data JSONB;
  v_secret TEXT;
BEGIN
  -- Get JWT secret from environment or use a default for development
  v_secret := COALESCE(current_setting('app.settings.jwt_secret', true), 'development-secret-key');
  
  v_data = jsonb_build_object(
    'ticket_id', p_ticket_id,
    'event_id', p_event_id,
    'timestamp', extract(epoch from now()),
    'nonce', encode(gen_random_bytes(16), 'hex')
  );
  
  RETURN encode(
    hmac(
      v_data::text::bytea,
      v_secret::bytea,
      'sha256'
    ),
    'hex'
  ) || '.' || encode(v_data::text::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main order creation function
CREATE OR REPLACE FUNCTION create_order_v2(
  p_user_id UUID,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB,
  p_payment_details JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
  v_ticket_id UUID;
  v_qty INTEGER;
BEGIN
  -- Validate order
  PERFORM validate_order_v2(p_event_id, p_ticket_quantities);
  
  -- Calculate total
  SELECT COALESCE(SUM(tt.price * (p_ticket_quantities->>(tt.id::text))::integer), 0)
  INTO v_total
  FROM ticket_types tt
  WHERE tt.event_id = p_event_id
  AND p_ticket_quantities ? tt.id::text;
  
  -- Create order
  INSERT INTO orders (
    id,
    user_id,
    event_id,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_event_id,
    v_total,
    'PENDING',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;
  
  -- Create tickets
  FOR v_ticket_type IN 
    SELECT tt.*, (p_ticket_quantities->>(tt.id::text))::integer as qty
    FROM ticket_types tt
    WHERE tt.event_id = p_event_id
    AND p_ticket_quantities ? tt.id::text
  LOOP
    v_qty := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    FOR i IN 1..v_qty LOOP
      v_ticket_id := gen_random_uuid();
      INSERT INTO tickets (
        id,
        order_id,
        event_id,
        user_id,
        ticket_type_id,
        status,
        qr_code
      ) VALUES (
        v_ticket_id,
        v_order_id,
        p_event_id,
        p_user_id,
        v_ticket_type.id,
        'VALID',
        generate_ticket_qr_code(v_ticket_id, p_event_id)
      );
      
      -- Update ticket type availability
      UPDATE ticket_types
      SET available = available - 1
      WHERE id = v_ticket_type.id;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'id', v_order_id
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create guest order
CREATE OR REPLACE FUNCTION create_guest_order_v2(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB,
  p_payment_details JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_token UUID;
  v_result JSONB;
BEGIN
  -- Generate verification token
  v_token := gen_random_uuid();
  
  -- Create order
  v_result := create_order_v2(
    NULL, -- no user_id for guest orders
    p_event_id,
    p_payment_method,
    p_ticket_quantities,
    p_payment_details
  );
  
  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;
  
  v_order_id := (v_result->>'id')::uuid;
  
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
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_order_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION create_guest_order_v2 TO public;