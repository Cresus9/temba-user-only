-- Add user_id to tickets table if not exists
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create view for ticket details with user information
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
  p.name as user_name,
  p.email as user_email
FROM tickets t
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN events e ON e.id = t.event_id
JOIN auth.users u ON u.id = t.user_id
JOIN profiles p ON p.user_id = t.user_id;

-- Grant access to the view
GRANT SELECT ON ticket_details TO authenticated;