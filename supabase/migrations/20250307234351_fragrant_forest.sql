/*
  # Fix Guest Orders RLS and Functions

  1. Changes
    - Drop existing functions before recreation
    - Add proper RLS policies for guest orders
    - Create secure order processing functions
    - Add necessary indexes for performance

  2. Security
    - Enable RLS on all affected tables
    - Add proper policies for guest access
    - Implement secure token handling
*/

-- Set search path
SET search_path TO public, extensions;

-- Drop existing functions first
DROP FUNCTION IF EXISTS process_guest_order(uuid, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS verify_guest_order(uuid);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_orders_token ON guest_orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(email);

-- Function to process guest order
CREATE OR REPLACE FUNCTION process_guest_order(
  p_event_id UUID,
  p_guest_email TEXT,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_payment_method TEXT,
  p_ticket_quantities JSONB
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_token UUID;
  v_ticket_type RECORD;
  v_available INTEGER;
BEGIN
  -- Validate event status
  IF NOT EXISTS (
    SELECT 1 FROM events 
    WHERE id = p_event_id 
    AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'Event not available for booking';
  END IF;

  -- Start transaction
  BEGIN
    -- Lock ticket types for update
    FOR v_ticket_type IN 
      SELECT id, price, available, max_per_order 
      FROM ticket_types 
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      IF p_ticket_quantities ? v_ticket_type.id::text THEN
        v_available := v_ticket_type.available;
        
        IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_available THEN
          RAISE EXCEPTION 'Not enough tickets available';
        END IF;
        
        IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_ticket_type.max_per_order THEN
          RAISE EXCEPTION 'Maximum tickets per order exceeded';
        END IF;
        
        v_total := v_total + (v_ticket_type.price * (p_ticket_quantities->>v_ticket_type.id::text)::int);
        
        -- Update available tickets
        UPDATE ticket_types 
        SET available = available - (p_ticket_quantities->>v_ticket_type.id::text)::int
        WHERE id = v_ticket_type.id;
      END IF;
    END LOOP;

    -- Generate order token
    v_token := gen_random_uuid();

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

    -- Return success response
    RETURN jsonb_build_object(
      'order_id', v_order_id,
      'token', v_token,
      'total', v_total,
      'success', true
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;

-- Function to verify guest order
CREATE OR REPLACE FUNCTION verify_guest_order(p_token UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_record RECORD;
BEGIN
  SELECT o.id, o.status, o.event_id, g.email
  INTO v_order_record
  FROM orders o
  JOIN guest_orders g ON g.order_id = o.id
  WHERE g.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_record.id,
    'status', v_order_record.status,
    'event_id', v_order_record.event_id,
    'email', v_order_record.email
  );
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS orders_insert_policy ON orders;
DROP POLICY IF EXISTS orders_select_policy ON orders;
DROP POLICY IF EXISTS guest_orders_insert_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_select_policy ON guest_orders;

-- RLS Policies for orders
CREATE POLICY orders_insert_policy ON orders
FOR INSERT TO public
WITH CHECK (
  (guest_email IS NOT NULL) OR 
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY orders_select_policy ON orders
FOR SELECT TO public
USING (
  (guest_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM guest_orders
    WHERE guest_orders.order_id = orders.id
    AND guest_orders.email = guest_email
  )) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'ADMIN'
  ))
);

-- RLS Policies for guest orders
CREATE POLICY guest_orders_insert_policy ON guest_orders
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
    AND orders.guest_email IS NOT NULL
  )
);

CREATE POLICY guest_orders_select_policy ON guest_orders
FOR SELECT TO public
USING (
  email = current_user OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);