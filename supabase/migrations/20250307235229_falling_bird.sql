/*
  # Guest Orders System

  1. Changes
    - Add RLS policies for guest orders
    - Add indexes for performance
    - Add guest order management functions
    - Add cleanup trigger for expired orders

  2. Security
    - Enable RLS on all tables
    - Add proper policies for guest access
    - Implement secure token handling
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_orders_token ON guest_orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(email);
CREATE INDEX IF NOT EXISTS idx_guest_orders_order_id ON guest_orders(order_id);

-- Add constraint to ensure either user_id or guest_email is set, but not both
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_user_or_guest_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT order_user_or_guest_check
    CHECK (
      ((user_id IS NOT NULL AND guest_email IS NULL) OR 
       (user_id IS NULL AND guest_email IS NOT NULL))
    );
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for guest orders" ON orders;
DROP POLICY IF EXISTS "Enable read access for guest orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for guest orders" ON guest_orders;
DROP POLICY IF EXISTS "Enable read access for guest orders" ON guest_orders;

-- RLS Policies for orders
CREATE POLICY "Enable insert for guest orders"
  ON orders FOR INSERT TO public
  WITH CHECK (
    guest_email IS NOT NULL OR 
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Enable read access for guest orders"
  ON orders FOR SELECT TO public
  USING (
    guest_email IS NOT NULL OR 
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    ))
  );

-- RLS Policies for guest_orders
CREATE POLICY "Enable insert for guest orders"
  ON guest_orders FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.guest_email IS NOT NULL
    )
  );

CREATE POLICY "Enable read access for guest orders"
  ON guest_orders FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = guest_orders.order_id
      AND orders.guest_email = guest_orders.email
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Drop existing trigger first, then function
DROP TRIGGER IF EXISTS cleanup_expired_guest_orders_trigger ON guest_orders;
DROP FUNCTION IF EXISTS cleanup_expired_guest_orders();
DROP FUNCTION IF EXISTS create_guest_order(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS verify_guest_order(UUID);

-- Function to cleanup expired guest orders
CREATE OR REPLACE FUNCTION cleanup_expired_guest_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete guest orders older than 48 hours that haven't been verified
  DELETE FROM orders
  WHERE guest_email IS NOT NULL
    AND status = 'PENDING'
    AND created_at < NOW() - INTERVAL '48 hours';
  
  RETURN NULL;
END;
$$;

-- Trigger to cleanup expired guest orders
CREATE TRIGGER cleanup_expired_guest_orders_trigger
  AFTER INSERT OR UPDATE ON guest_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_guest_orders();

-- Function to create guest order
CREATE OR REPLACE FUNCTION create_guest_order(
  p_event_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_payment_method TEXT,
  p_ticket_quantities JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_token UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
BEGIN
  -- Validate event
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND status = 'PUBLISHED'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not available'
    );
  END IF;

  -- Calculate total and validate quantities
  FOR v_ticket_type IN
    SELECT id, price, available, max_per_order
    FROM ticket_types
    WHERE event_id = p_event_id
    FOR UPDATE
  LOOP
    IF p_ticket_quantities ? v_ticket_type.id::text THEN
      IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_ticket_type.available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Not enough tickets available'
        );
      END IF;

      IF (p_ticket_quantities->>v_ticket_type.id::text)::int > v_ticket_type.max_per_order THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Maximum tickets per order exceeded'
        );
      END IF;

      v_total := v_total + (v_ticket_type.price * (p_ticket_quantities->>v_ticket_type.id::text)::int);
    END IF;
  END LOOP;

  -- Generate token
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
    p_email,
    p_payment_method,
    'PENDING',
    v_total,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create guest order
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
    'token', v_token,
    'total', v_total
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to verify guest order
CREATE OR REPLACE FUNCTION verify_guest_order(
  p_token UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_record RECORD;
BEGIN
  -- Get order details
  SELECT 
    o.id,
    o.status,
    o.event_id,
    g.email
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