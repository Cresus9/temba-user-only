/*
  # Guest Order System Implementation

  1. New Functions
    - generate_guest_token: Creates unique tokens for guest orders
    - validate_guest_order: Validates guest order data
    - create_guest_order_direct: Creates orders for guest users

  2. Changes
    - Added guest order creation functionality
    - Added order validation
    - Added token generation
*/

-- Function to generate a unique guest token
CREATE OR REPLACE FUNCTION generate_guest_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to validate guest order data
CREATE OR REPLACE FUNCTION validate_guest_order(
  p_email text,
  p_event_id uuid,
  p_ticket_quantities jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_exists boolean;
  v_ticket_type record;
  v_quantity integer;
BEGIN
  -- Check if event exists and is published
  SELECT EXISTS (
    SELECT 1 FROM events 
    WHERE id = p_event_id 
    AND status = 'PUBLISHED'
  ) INTO v_event_exists;
  
  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'Event not found or not available';
  END IF;

  -- Validate ticket quantities
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

  RETURN true;
END;
$$;

-- Function to create guest order
CREATE OR REPLACE FUNCTION create_guest_order_direct(
  p_email text,
  p_name text,
  p_phone text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_guest_token text;
  v_total numeric := 0;
  v_ticket_type record;
  v_quantity integer;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_name IS NULL OR p_event_id IS NULL OR p_ticket_quantities IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required fields');
  END IF;

  -- Validate order data
  PERFORM validate_guest_order(p_email, p_event_id, p_ticket_quantities);

  -- Generate guest token
  v_guest_token := generate_guest_token();

  -- Calculate total
  FOR v_ticket_type IN 
    SELECT id, price 
    FROM ticket_types 
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity > 0 THEN
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
    'COMPLETED',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create guest order record
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
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'token', v_guest_token
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "guest_orders_select_policy" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_insert_policy" ON guest_orders;
  DROP POLICY IF EXISTS "Guest orders are viewable by email" ON guest_orders;
  DROP POLICY IF EXISTS "System can insert guest orders" ON guest_orders;
END $$;

-- Ensure RLS is enabled
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "guest_orders_view_policy_v2"
  ON guest_orders
  FOR SELECT
  USING (email = current_user);

CREATE POLICY "guest_orders_insert_policy_v2"
  ON guest_orders
  FOR INSERT
  WITH CHECK (true);