/*
  # Guest Orders Implementation

  1. New Tables
    - guest_orders: Stores guest user information
    - guest_ticket_details: View for guest ticket information

  2. Functions
    - guest_order_processor: Handles guest order creation
    - cleanup_expired_guest_orders: Removes old guest orders

  3. Security
    - RLS policies for guest access
    - Secure token generation
*/

-- Create guest_orders table
CREATE TABLE IF NOT EXISTS guest_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guest_orders_order_id ON guest_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_guest_orders_email ON guest_orders(email);
CREATE INDEX IF NOT EXISTS idx_guest_orders_token ON guest_orders(token);

-- Create guest ticket details view
CREATE OR REPLACE VIEW guest_ticket_details AS
SELECT 
  t.id,
  t.order_id,
  t.event_id,
  t.user_id,
  t.ticket_type_id,
  t.status,
  t.qr_code,
  t.created_at,
  t.updated_at,
  t.seat_id,
  t.scanned_at,
  t.scanned_by,
  t.scan_location,
  t.transfer_id,
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.image_url as event_image,
  go.name as guest_name,
  go.email as guest_email,
  go.token as token
FROM tickets t
JOIN ticket_types tt ON t.ticket_type_id = tt.id
JOIN events e ON t.event_id = e.id
JOIN orders o ON t.order_id = o.id
JOIN guest_orders go ON o.id = go.order_id;

-- Create guest order processor function
CREATE OR REPLACE FUNCTION guest_order_processor(
  p_email text,
  p_name text,
  p_phone text,
  p_event_id uuid,
  p_payment_method text,
  p_ticket_quantities jsonb,
  p_payment_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_token uuid;
  v_total numeric;
  v_ticket_type RECORD;
BEGIN
  -- Validate email
  IF NOT p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Calculate total
  v_total := 0;
  FOR v_ticket_type IN 
    SELECT tt.*, (q.value)::integer as qty
    FROM jsonb_each_text(p_ticket_quantities) q
    JOIN ticket_types tt ON tt.id = q.key::uuid
  LOOP
    IF v_ticket_type.qty <= 0 THEN
      CONTINUE;
    END IF;

    IF v_ticket_type.available < v_ticket_type.qty THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Not enough tickets available for type %s', v_ticket_type.id)
      );
    END IF;

    v_total := v_total + (v_ticket_type.price * v_ticket_type.qty);
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
    phone
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    p_phone
  ) RETURNING token INTO v_token;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS cleanup_expired_guest_orders_trigger ON guest_orders;

-- Drop existing function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS cleanup_expired_guest_orders() CASCADE;

-- Create cleanup function for expired guest orders
CREATE OR REPLACE FUNCTION cleanup_expired_guest_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete guest orders older than 48 hours that are still pending
  DELETE FROM orders
  WHERE guest_email IS NOT NULL
    AND status = 'PENDING'
    AND created_at < now() - interval '48 hours';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
CREATE TRIGGER cleanup_expired_guest_orders_trigger
  AFTER INSERT OR UPDATE ON guest_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_guest_orders();

-- Enable RLS
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS guest_orders_insert_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_select_policy ON guest_orders;
DROP POLICY IF EXISTS orders_guest_access_policy ON orders;
DROP POLICY IF EXISTS tickets_guest_access_policy ON tickets;

-- Create policies
CREATE POLICY guest_orders_insert_policy ON guest_orders
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY guest_orders_select_policy ON guest_orders
  FOR SELECT TO public
  USING (
    email = current_user OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Update orders table policies for guest access
CREATE POLICY orders_guest_access_policy ON orders
  FOR ALL TO public
  USING (
    guest_email IS NOT NULL OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Update tickets table policies for guest access
CREATE POLICY tickets_guest_access_policy ON tickets
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.guest_email IS NOT NULL
    ) OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );