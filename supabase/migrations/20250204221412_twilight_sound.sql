-- Drop existing function if it exists
DROP FUNCTION IF EXISTS scan_ticket;

-- Create improved scan_ticket function with better error handling and JSONB response
CREATE OR REPLACE FUNCTION scan_ticket(
  p_ticket_id UUID,
  p_scanned_by UUID,
  p_scan_location TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_result JSONB;
BEGIN
  -- Get ticket details with all related information
  SELECT 
    t.*,
    e.date as event_date,
    e.title as event_title,
    tt.name as ticket_type_name,
    p.name as user_name
  INTO v_ticket
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN profiles p ON p.user_id = t.user_id
  WHERE t.id = p_ticket_id;

  -- Check if ticket exists
  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ticket not found'
    );
  END IF;

  -- Check if ticket is valid
  IF v_ticket.status != 'VALID' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Ticket is not valid (Status: %s)', v_ticket.status),
      'ticket', jsonb_build_object(
        'eventTitle', v_ticket.event_title,
        'ticketType', v_ticket.ticket_type_name,
        'userName', v_ticket.user_name
      )
    );
  END IF;

  -- Check if scanner has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = p_scanned_by
    AND role = 'ADMIN'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized to scan tickets'
    );
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

  -- Return success result with ticket details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ticket validated successfully',
    'ticket', jsonb_build_object(
      'eventTitle', v_ticket.event_title,
      'ticketType', v_ticket.ticket_type_name,
      'userName', v_ticket.user_name
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in scan_ticket: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Error validating ticket: %s', SQLERRM)
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION scan_ticket TO authenticated;