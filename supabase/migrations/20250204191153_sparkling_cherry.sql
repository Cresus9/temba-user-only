-- Add scanning-related fields to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scanned_by uuid REFERENCES auth.users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scan_location text;

-- Create function to validate and scan ticket
CREATE OR REPLACE FUNCTION scan_ticket(
  p_ticket_id UUID,
  p_scanned_by UUID,
  p_scan_location TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_status TEXT;
BEGIN
  -- Get current ticket status
  SELECT status INTO v_ticket_status
  FROM tickets
  WHERE id = p_ticket_id;

  -- Check if ticket exists and is valid
  IF v_ticket_status IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket_status != 'VALID' THEN
    RETURN FALSE;
  END IF;

  -- Update ticket status
  UPDATE tickets
  SET 
    status = 'USED',
    scanned_at = NOW(),
    scanned_by = p_scanned_by,
    scan_location = p_scan_location
  WHERE id = p_ticket_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create view for scanned tickets
CREATE OR REPLACE VIEW scanned_tickets_view AS
SELECT 
  t.id,
  t.qr_code,
  t.status,
  t.scanned_at,
  t.scan_location,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  p.name as user_name,
  p.email as user_email,
  sp.name as scanned_by_name
FROM tickets t
JOIN events e ON e.id = t.event_id
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN profiles sp ON sp.user_id = t.scanned_by
WHERE t.scanned_at IS NOT NULL
ORDER BY t.scanned_at DESC;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_at ON tickets(scanned_at);
CREATE INDEX IF NOT EXISTS idx_tickets_scanned_by ON tickets(scanned_by);