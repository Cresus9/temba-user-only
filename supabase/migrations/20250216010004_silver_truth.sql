-- Drop existing view if it exists
DROP VIEW IF EXISTS ticket_transfer_details;

-- Create view for ticket transfer details
CREATE OR REPLACE VIEW ticket_transfer_details AS
SELECT 
  tt.*,
  sp.name as sender_name,
  sp.email as sender_email,
  rp.name as recipient_name,
  rp.email as recipient_email,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  ttype.name as ticket_type_name,
  ttype.price as ticket_type_price
FROM ticket_transfers tt
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
JOIN ticket_types ttype ON ttype.id = t.ticket_type_id
JOIN profiles sp ON sp.user_id = tt.sender_id
JOIN profiles rp ON rp.user_id = tt.recipient_id;

-- Grant access to the view
GRANT SELECT ON ticket_transfer_details TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status 
ON ticket_transfers(status);