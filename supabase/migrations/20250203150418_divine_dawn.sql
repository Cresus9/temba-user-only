-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_seat_status_on_ticket ON tickets;
DROP FUNCTION IF EXISTS update_seat_status();

-- Create function to update seat status
CREATE OR REPLACE FUNCTION update_seat_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the seat status when a ticket is created
  IF TG_OP = 'INSERT' AND NEW.seat_id IS NOT NULL THEN
    UPDATE venue_seats
    SET status = 'sold'
    WHERE id = NEW.seat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seat status updates
CREATE TRIGGER update_seat_status_on_ticket
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_seat_status();

-- Create function to validate seat availability
CREATE OR REPLACE FUNCTION validate_seats(
  p_event_id UUID,
  p_seat_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unavailable_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_unavailable_count
  FROM venue_seats vs
  WHERE vs.id = ANY(p_seat_ids)
  AND vs.status != 'available';

  RETURN v_unavailable_count = 0;
END;
$$;

-- Create function to reserve seats
CREATE OR REPLACE FUNCTION reserve_seats(
  p_event_id UUID,
  p_seat_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if seats are available
  IF NOT validate_seats(p_event_id, p_seat_ids) THEN
    RETURN FALSE;
  END IF;

  -- Reserve the seats
  UPDATE venue_seats
  SET status = 'reserved'
  WHERE id = ANY(p_seat_ids)
  AND status = 'available';

  RETURN TRUE;
END;
$$;

-- Create function to release reserved seats
CREATE OR REPLACE FUNCTION release_seats(
  p_event_id UUID,
  p_seat_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE venue_seats
  SET status = 'available'
  WHERE id = ANY(p_seat_ids)
  AND status = 'reserved';
END;
$$;