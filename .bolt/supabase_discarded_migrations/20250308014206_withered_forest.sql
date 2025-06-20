/*
  # Orders System Setup

  1. New Tables
    - orders: Stores order information
    - guest_orders: Stores guest order information
    - high_risk_orders: Stores flagged orders for review
    
  2. Views
    - order_details: Comprehensive view of order information
    
  3. Functions & Triggers
    - calculate_order_total: Calculates order total
    - create_tickets_for_order: Creates tickets after order
    - send_order_email: Sends confirmation email
    
  4. Security
    - RLS policies for all tables
    - Function permissions
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_total_before_insert ON orders;
DROP TRIGGER IF EXISTS create_tickets_after_order ON orders;
DROP TRIGGER IF EXISTS send_order_email_trigger ON orders;

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  payment_method text NOT NULL,
  ticket_quantities jsonb,
  guest_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure either user_id or guest_email is provided, but not both
  CONSTRAINT order_user_or_guest_check CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL) OR
    (user_id IS NULL AND guest_email IS NOT NULL)
  )
);

-- Create guest_orders table
CREATE TABLE IF NOT EXISTS guest_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create high_risk_orders table
CREATE TABLE IF NOT EXISTS high_risk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  amount numeric NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  reasons text,
  ip text NOT NULL,
  device_id text NOT NULL,
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Drop existing view if exists
DROP VIEW IF EXISTS order_details;

-- Create order_details view
CREATE VIEW order_details AS
SELECT 
  o.id,
  o.user_id,
  o.event_id,
  o.total,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at,
  o.guest_email,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency,
  p.name as user_name,
  p.email as user_email,
  COUNT(t.id) as ticket_count,
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'type', tt.name,
        'price', tt.price,
        'quantity', 1
      )
    ) FILTER (WHERE tt.id IS NOT NULL),
    '[]'::jsonb
  ) as tickets
FROM orders o
LEFT JOIN events e ON e.id = o.event_id
LEFT JOIN profiles p ON p.user_id = o.user_id
LEFT JOIN tickets t ON t.order_id = o.id
LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
GROUP BY 
  o.id,
  o.user_id,
  o.event_id,
  o.total,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at,
  o.guest_email,
  e.title,
  e.date,
  e.time,
  e.location,
  e.currency,
  p.name,
  p.email;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_order_total CASCADE;
DROP FUNCTION IF EXISTS create_tickets_for_order CASCADE;
DROP FUNCTION IF EXISTS send_order_email CASCADE;

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
BEGIN
  FOR v_ticket_type IN 
    SELECT tt.*, (NEW.ticket_quantities->>(tt.id::text))::integer as qty
    FROM ticket_types tt
    WHERE tt.event_id = NEW.event_id
    AND NEW.ticket_quantities ? tt.id::text
  LOOP
    v_total := v_total + (v_ticket_type.price * v_ticket_type.qty);
  END LOOP;
  
  NEW.total := v_total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create tickets after order
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type RECORD;
  v_qty INTEGER;
  v_ticket_id UUID;
BEGIN
  FOR v_ticket_type IN 
    SELECT tt.*, (NEW.ticket_quantities->>(tt.id::text))::integer as qty
    FROM ticket_types tt
    WHERE tt.event_id = NEW.event_id
    AND NEW.ticket_quantities ? tt.id::text
  LOOP
    v_qty := (NEW.ticket_quantities->>(v_ticket_type.id::text))::integer;
    
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
        NEW.id,
        NEW.event_id,
        NEW.user_id,
        v_ticket_type.id,
        'VALID',
        encode(
          hmac(
            v_ticket_id::text || '.' || extract(epoch from now())::text,
            current_setting('app.settings.jwt_secret', true)::bytea,
            'sha256'
          ),
          'hex'
        )
      );
      
      -- Update ticket availability
      UPDATE ticket_types
      SET available = available - 1
      WHERE id = v_ticket_type.id;
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send order confirmation email
CREATE OR REPLACE FUNCTION send_order_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Invoke email function (implemented in Edge Functions)
  PERFORM http_post(
    url := current_setting('app.settings.webhook_url') || '/ticket-email',
    body := json_build_object(
      'orderId', NEW.id,
      'email', COALESCE(NEW.guest_email, (
        SELECT email FROM auth.users WHERE id = NEW.user_id
      ))
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER calculate_total_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();

CREATE TRIGGER create_tickets_after_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_tickets_for_order();

CREATE TRIGGER send_order_email_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_order_email();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_risk_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id OR
    (guest_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM guest_orders
      WHERE order_id = orders.id AND email = guest_email
    )) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (guest_email IS NOT NULL)
  );

-- RLS Policies for guest_orders
CREATE POLICY "Enable insert for guest orders"
  ON guest_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = guest_orders.order_id AND guest_email IS NOT NULL
    )
  );

CREATE POLICY "Enable read access for guest orders"
  ON guest_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = guest_orders.order_id AND guest_email = guest_orders.email
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for high_risk_orders
CREATE POLICY "Admins can manage high risk orders"
  ON high_risk_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_order_total TO authenticated, public;
GRANT EXECUTE ON FUNCTION create_tickets_for_order TO authenticated, public;
GRANT EXECUTE ON FUNCTION send_order_email TO authenticated, public;