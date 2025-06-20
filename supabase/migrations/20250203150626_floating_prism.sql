-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS update_seat_status_on_ticket ON tickets;
DROP FUNCTION IF EXISTS update_seat_status();

-- Add seat_id column to tickets if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'seat_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN seat_id uuid REFERENCES venue_seats(id);
  END IF;
END $$;

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
  -- Return true if no seats to validate
  IF p_seat_ids IS NULL OR array_length(p_seat_ids, 1) = 0 THEN
    RETURN TRUE;
  END IF;

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
  -- Skip if no seats to reserve
  IF p_seat_ids IS NULL OR array_length(p_seat_ids, 1) = 0 THEN
    RETURN TRUE;
  END IF;

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
  -- Skip if no seats to release
  IF p_seat_ids IS NULL OR array_length(p_seat_ids, 1) = 0 THEN
    RETURN;
  END IF;

  UPDATE venue_seats
  SET status = 'available'
  WHERE id = ANY(p_seat_ids)
  AND status = 'reserved';
END;
$$;

-- Update create_order function to handle optional seats
CREATE OR REPLACE FUNCTION create_order(
  p_event_id UUID,
  p_user_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT,
  p_seat_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
  v_available INTEGER;
  v_quantity INTEGER;
  v_seat_index INTEGER := 1;
BEGIN
  -- Start transaction
  BEGIN
    -- Validate seats if provided
    IF p_seat_ids IS NOT NULL AND NOT validate_seats(p_event_id, p_seat_ids) THEN
      RAISE EXCEPTION 'One or more selected seats are not available';
    END IF;

    -- Create order
    INSERT INTO orders (
      event_id,
      user_id,
      total,
      status,
      payment_method
    ) VALUES (
      p_event_id,
      p_user_id,
      0, -- Will update this later
      'PENDING',
      p_payment_method
    ) RETURNING id INTO v_order_id;

    -- Process each ticket type
    FOR v_ticket_type IN 
      SELECT tt.id, tt.price, tt.available, tt.max_per_order
      FROM ticket_types tt
      WHERE tt.event_id = p_event_id
      FOR UPDATE
    LOOP
      -- Get requested quantity
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL OR v_quantity = 0 THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RAISE EXCEPTION 'Not enough tickets available';
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RAISE EXCEPTION 'Exceeds maximum tickets per order';
      END IF;

      -- Create tickets
      FOR i IN 1..v_quantity LOOP
        INSERT INTO tickets (
          order_id,
          event_id,
          user_id,
          ticket_type_id,
          seat_id,
          status,
          qr_code
        ) VALUES (
          v_order_id,
          p_event_id,
          p_user_id,
          v_ticket_type.id,
          CASE 
            WHEN p_seat_ids IS NOT NULL AND v_seat_index <= array_length(p_seat_ids, 1) 
            THEN p_seat_ids[v_seat_index]
            ELSE NULL
          END,
          'VALID',
          encode(gen_random_bytes(32), 'hex')
        );
        
        -- Increment seat index if we're using seats
        IF p_seat_ids IS NOT NULL THEN
          v_seat_index := v_seat_index + 1;
        END IF;
      END LOOP;

      -- Update available tickets
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    -- Update order total with processing fee
    UPDATE orders
    SET total = v_total + (v_total * 0.02) -- Add 2% processing fee
    WHERE id = v_order_id;

    -- Update event tickets sold count
    UPDATE events
    SET tickets_sold = tickets_sold + (
      SELECT COUNT(*)
      FROM tickets
      WHERE order_id = v_order_id
    )
    WHERE id = p_event_id;

    RETURN v_order_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Release any reserved seats on error
      IF p_seat_ids IS NOT NULL THEN
        PERFORM release_seats(p_event_id, p_seat_ids);
      END IF;
      RAISE;
  END;
END;
$$;