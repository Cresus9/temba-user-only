/*
  # Ticket Validation System

  1. New Functions
    - validate_ticket: Validates and processes ticket scans
    - get_ticket_details: Retrieves formatted ticket details
    
  2. Security
    - Enable RLS on related tables
    - Add policies for ticket validation
    
  3. Configuration
    - Add necessary settings for ticket validation
*/

-- Create function to validate tickets
CREATE OR REPLACE FUNCTION validate_ticket(
  p_ticket_id UUID,
  p_scanned_by UUID,
  p_scan_location TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket RECORD;
  v_event RECORD;
  v_user RECORD;
  v_result JSONB;
BEGIN
  -- Get ticket details
  SELECT t.*, tt.name as ticket_type_name, e.title as event_title, e.date as event_date
  INTO v_ticket
  FROM tickets t
  JOIN ticket_types tt ON t.ticket_type_id = tt.id
  JOIN events e ON t.event_id = e.id
  WHERE t.id = p_ticket_id;

  -- Validate ticket exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid ticket'
    );
  END IF;

  -- Check if ticket is already used
  IF v_ticket.status = 'USED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ticket has already been used',
      'scanned_at', v_ticket.scanned_at,
      'scan_location', v_ticket.scan_location
    );
  END IF;

  -- Get ticket holder details
  SELECT name, email INTO v_user
  FROM profiles
  WHERE user_id = v_ticket.user_id;

  -- Update ticket status
  UPDATE tickets
  SET 
    status = 'USED',
    scanned_at = NOW(),
    scanned_by = p_scanned_by,
    scan_location = COALESCE(p_scan_location, 'Main Entrance')
  WHERE id = p_ticket_id;

  -- Create scan record
  INSERT INTO ticket_scans (
    ticket_id,
    scanned_by,
    scan_location
  ) VALUES (
    p_ticket_id,
    p_scanned_by,
    COALESCE(p_scan_location, 'Main Entrance')
  );

  -- Return success response with ticket details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ticket validated successfully',
    'ticket', jsonb_build_object(
      'eventTitle', v_ticket.event_title,
      'ticketType', v_ticket.ticket_type_name,
      'userName', COALESCE(v_user.name, v_user.email),
      'eventDate', v_ticket.event_date
    )
  );
END;
$$;

-- Create function to get ticket details
CREATE OR REPLACE FUNCTION get_ticket_details(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'qrCode', t.qr_code,
    'event', jsonb_build_object(
      'title', e.title,
      'date', e.date,
      'time', e.time,
      'location', e.location
    ),
    'ticketType', jsonb_build_object(
      'name', tt.name,
      'price', tt.price
    ),
    'user', jsonb_build_object(
      'name', p.name,
      'email', p.email
    )
  ) INTO v_result
  FROM tickets t
  JOIN events e ON t.event_id = e.id
  JOIN ticket_types tt ON t.ticket_type_id = tt.id
  LEFT JOIN profiles p ON t.user_id = p.user_id
  WHERE t.id = p_ticket_id;

  RETURN v_result;
END;
$$;

-- Add RLS policies for ticket validation
ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can create ticket scans"
  ON ticket_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'STAFF')
    )
  );

CREATE POLICY "Staff can view ticket scans"
  ON ticket_scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'STAFF')
    )
  );