-- Drop existing function if it exists
DROP FUNCTION IF EXISTS scan_ticket;

-- Create function to scan and validate tickets with correct parameter order
CREATE OR REPLACE FUNCTION scan_ticket(
  p_ticket_id UUID,
  p_scanned_by UUID,
  p_scan_location TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Log the scan
  INSERT INTO ticket_scans (
    ticket_id,
    scanned_by,
    scan_location
  ) VALUES (
    p_ticket_id,
    p_scanned_by,
    COALESCE(p_scan_location, 'Unknown')
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in scan_ticket: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create ticket_scans table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scan_location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ticket_scans
ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;

-- Create policy for ticket_scans
CREATE POLICY "Users can view scans they performed"
  ON ticket_scans FOR SELECT
  USING (
    scanned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON ticket_scans(scanned_by);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ticket_scans TO authenticated;
GRANT EXECUTE ON FUNCTION scan_ticket TO authenticated;