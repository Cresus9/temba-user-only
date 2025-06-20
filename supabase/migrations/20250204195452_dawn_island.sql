-- Drop existing function if it exists
DROP FUNCTION IF EXISTS scan_ticket;

-- Create function to scan and validate tickets with improved error handling
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
  v_event_id UUID;
BEGIN
  -- Get current ticket status and event details
  SELECT 
    t.status,
    e.date,
    e.id INTO v_ticket_status, v_event_date, v_event_id
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  WHERE t.id = p_ticket_id;

  -- Check if ticket exists
  IF v_ticket_status IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Check if ticket is valid
  IF v_ticket_status != 'VALID' THEN
    RAISE EXCEPTION 'Ticket is not valid (Status: %)', v_ticket_status;
  END IF;

  -- Check if scanner has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = p_scanned_by
    AND (role = 'ADMIN' OR user_id IN (
      SELECT user_id FROM event_staff WHERE event_id = v_event_id
    ))
  ) THEN
    RAISE EXCEPTION 'Unauthorized to scan tickets';
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
    -- Log the error
    RAISE LOG 'Error in scan_ticket: %', SQLERRM;
    
    -- Re-raise the error with a user-friendly message
    RAISE EXCEPTION 'Failed to validate ticket: %', SQLERRM;
END;
$$;

-- Create event_staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_staff
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

-- Create policy for event_staff
CREATE POLICY "event_staff_policy"
  ON event_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id ON event_staff(user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON event_staff TO authenticated;
GRANT EXECUTE ON FUNCTION scan_ticket TO authenticated;