-- Drop existing views if they exist
DROP VIEW IF EXISTS order_details;
DROP VIEW IF EXISTS ticket_details;

-- Create view for order details
CREATE OR REPLACE VIEW order_details AS
SELECT 
  o.id,
  o.user_id,
  o.event_id,
  o.total,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency,
  p.name as user_name,
  p.email as user_email,
  (
    SELECT COUNT(*) 
    FROM tickets t 
    WHERE t.order_id = o.id
  ) as ticket_count
FROM orders o
LEFT JOIN events e ON e.id = o.event_id
LEFT JOIN profiles p ON p.user_id = o.user_id;

-- Create view for ticket details
CREATE OR REPLACE VIEW ticket_details AS
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
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency
FROM tickets t
LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
LEFT JOIN events e ON e.id = t.event_id;

-- Update orders RLS policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Update tickets RLS policies
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);