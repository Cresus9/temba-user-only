-- Drop existing view if it exists
DROP VIEW IF EXISTS scanned_tickets_view;

-- Create view for scanned tickets
CREATE VIEW scanned_tickets_view AS
SELECT 
  t.id,
  t.qr_code,
  t.status,
  t.scanned_at,
  t.scan_location,
  e.title as event_title,
  tt.name as ticket_type_name,
  p.name as user_name,
  sp.name as scanned_by_name
FROM tickets t
JOIN events e ON e.id = t.event_id
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN profiles sp ON sp.user_id = t.scanned_by
WHERE t.scanned_at IS NOT NULL
ORDER BY t.scanned_at DESC;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_at ON tickets(scanned_at);

-- Grant access to the view
GRANT SELECT ON scanned_tickets_view TO authenticated;