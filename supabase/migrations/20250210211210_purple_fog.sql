-- Drop existing tables if they exist
DROP TABLE IF EXISTS high_risk_orders CASCADE;
DROP TABLE IF EXISTS fraud_checks CASCADE;

-- Create fraud_checks table
CREATE TABLE fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ip text NOT NULL,
  device_id text NOT NULL,
  amount numeric NOT NULL,
  risk_score integer NOT NULL,
  reasons text,
  created_at timestamptz DEFAULT now()
);

-- Create high_risk_orders table with correct relationships
CREATE TABLE high_risk_orders (
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

-- Enable RLS
ALTER TABLE fraud_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_risk_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for fraud_checks
CREATE POLICY "Admins can view fraud checks"
  ON fraud_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "System can insert fraud checks"
  ON fraud_checks FOR INSERT
  WITH CHECK (true);

-- Create policies for high_risk_orders
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
CREATE INDEX idx_fraud_checks_user_id ON fraud_checks(user_id);
CREATE INDEX idx_fraud_checks_created_at ON fraud_checks(created_at);
CREATE INDEX idx_high_risk_orders_user_id ON high_risk_orders(user_id);
CREATE INDEX idx_high_risk_orders_order_id ON high_risk_orders(order_id);
CREATE INDEX idx_high_risk_orders_reviewed ON high_risk_orders(reviewed);
CREATE INDEX idx_high_risk_orders_created_at ON high_risk_orders(created_at);

-- Create view for high risk order details
CREATE OR REPLACE VIEW high_risk_order_details AS
SELECT 
  hro.*,
  p.name as user_name,
  p.email as user_email,
  e.title as event_title,
  o.status as order_status,
  rp.name as reviewer_name
FROM high_risk_orders hro
JOIN profiles p ON p.user_id = hro.user_id
JOIN events e ON e.id = hro.event_id
JOIN orders o ON o.id = hro.order_id
LEFT JOIN profiles rp ON rp.user_id = hro.reviewed_by;

-- Grant necessary permissions
GRANT SELECT ON high_risk_order_details TO authenticated;