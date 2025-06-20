-- Create function to scan and validate tickets
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
  v_event_date DATE;
BEGIN
  -- Get current ticket status and event date
  SELECT 
    t.status,
    e.date INTO v_ticket_status, v_event_date
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  WHERE t.id = p_ticket_id;

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
    scan_location = COALESCE(p_scan_location, 'Unknown')
  WHERE id = p_ticket_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION scan_ticket TO authenticated;