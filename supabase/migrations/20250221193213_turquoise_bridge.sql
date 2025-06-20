-- Drop existing table if it exists
DROP TABLE IF EXISTS high_risk_orders CASCADE;

-- Create high_risk_orders table with correct relationships
CREATE TABLE high_risk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  reasons text,
  ip text NOT NULL,
  device_id text NOT NULL,
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE high_risk_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage high risk orders"
  ON high_risk_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_high_risk_orders_user_id ON high_risk_orders(user_id);
CREATE INDEX idx_high_risk_orders_order_id ON high_risk_orders(order_id);
CREATE INDEX idx_high_risk_orders_event_id ON high_risk_orders(event_id);
CREATE INDEX idx_high_risk_orders_reviewed ON high_risk_orders(reviewed);
CREATE INDEX idx_high_risk_orders_created_at ON high_risk_orders(created_at);

-- Recreate the view with proper joins
CREATE OR REPLACE VIEW high_risk_order_details AS
SELECT 
  hro.*,
  up.name as user_name,
  up.email as user_email,
  e.title as event_title,
  o.status as order_status,
  rp.name as reviewer_name
FROM high_risk_orders hro
JOIN auth.users u ON u.id = hro.user_id
JOIN profiles up ON up.user_id = hro.user_id
JOIN events e ON e.id = hro.event_id
JOIN orders o ON o.id = hro.order_id
LEFT JOIN auth.users ru ON ru.id = hro.reviewed_by
LEFT JOIN profiles rp ON rp.user_id = hro.reviewed_by;

-- Grant necessary permissions
GRANT SELECT ON high_risk_order_details TO authenticated;