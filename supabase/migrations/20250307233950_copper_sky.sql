/*
  # Fix Guest Orders and RLS Policies

  1. Changes
    - Add guest order processing functions
    - Update RLS policies for orders and guest orders
    - Add helper functions for order validation and processing

  2. Security
    - Enable RLS on all tables
    - Add proper policies for guest access
    - Ensure data isolation between users
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "guest_orders_insert_policy" ON guest_orders;
DROP POLICY IF EXISTS "guest_orders_select_policy" ON guest_orders;

-- Create order processing functions
CREATE OR REPLACE FUNCTION create_guest_order(
  p_event_id UUID,
  p_guest_email TEXT,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_payment_method TEXT,
  p_ticket_quantities JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_token UUID;
  v_ticket_type RECORD;
BEGIN
  -- Validate event status
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = p_event_id 
    AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'Event not available for booking';
  END IF;

  -- Calculate total and validate quantities
  FOR v_ticket_type IN 
    SELECT id, price, available, max_per_order 
    FROM ticket_types 
    WHERE event_id = p_event_id
  LOOP
    IF p_ticket_quantities ? v_ticket_type.id::text THEN
      IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_ticket_type.available THEN
        RAISE EXCEPTION 'Not enough tickets available';
      END IF;
      IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_ticket_type.max_per_order THEN
        RAISE EXCEPTION 'Maximum tickets per order exceeded';
      END IF;
      v_total := v_total + (v_ticket_type.price * (p_ticket_quantities->>v_ticket_type.id::text)::int);
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO orders (
    event_id,
    guest_email,
    payment_method,
    status,
    total,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_guest_email,
    p_payment_method,
    'PENDING',
    v_total,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Generate token
  v_token := gen_random_uuid();

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    phone,
    token
  ) VALUES (
    v_order_id,
    p_guest_email,
    p_guest_name,
    p_guest_phone,
    v_token
  );

  -- Return order details
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'token', v_token,
    'total', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for orders
CREATE POLICY "orders_insert_policy"
ON orders
FOR INSERT
TO public
WITH CHECK (
  (guest_email IS NOT NULL) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "orders_select_policy"
ON orders
FOR SELECT
TO public
USING (
  (guest_email IS NOT NULL AND guest_email = current_user) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'ADMIN'
  ))
);

-- Create RLS policies for guest orders
CREATE POLICY "guest_orders_insert_policy"
ON guest_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.guest_email IS NOT NULL
  )
);

CREATE POLICY "guest_orders_select_policy"
ON guest_orders
FOR SELECT
TO public
USING (
  email = current_user OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);

-- Add check constraint for orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_user_or_guest_check;
ALTER TABLE orders
ADD CONSTRAINT order_user_or_guest_check
CHECK (
  (user_id IS NOT NULL AND guest_email IS NULL) OR
  (user_id IS NULL AND guest_email IS NOT NULL)
);