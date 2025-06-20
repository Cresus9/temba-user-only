-- Drop existing view if it exists
DROP VIEW IF EXISTS high_risk_order_details;

-- Create improved view for high risk order details
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