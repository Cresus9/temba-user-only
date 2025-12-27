/*
  # Align event_dates_times with implementation guide
  
  Changes:
    - Rename capacity_override to capacity (to match guide)
    - Add tickets_sold field for per-date ticket tracking
    - Add trigger to update tickets_sold when tickets are created/deleted
*/

-- Rename capacity_override to capacity
ALTER TABLE event_dates_times 
  RENAME COLUMN capacity_override TO capacity;

-- Add tickets_sold field
ALTER TABLE event_dates_times 
  ADD COLUMN IF NOT EXISTS tickets_sold INTEGER DEFAULT 0;

-- Create function to update tickets_sold for a date
CREATE OR REPLACE FUNCTION update_event_date_tickets_sold()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tickets_sold when ticket is created
  IF TG_OP = 'INSERT' AND NEW.event_date_id IS NOT NULL THEN
    UPDATE event_dates_times
    SET tickets_sold = (
      SELECT COUNT(*)
      FROM tickets
      WHERE event_date_id = NEW.event_date_id
        AND status = 'VALID'
    )
    WHERE id = NEW.event_date_id;
    RETURN NEW;
  END IF;

  -- Update tickets_sold when ticket is deleted or status changes
  IF TG_OP = 'DELETE' AND OLD.event_date_id IS NOT NULL THEN
    UPDATE event_dates_times
    SET tickets_sold = (
      SELECT COUNT(*)
      FROM tickets
      WHERE event_date_id = OLD.event_date_id
        AND status = 'VALID'
    )
    WHERE id = OLD.event_date_id;
    RETURN OLD;
  END IF;

  -- Update tickets_sold when ticket status changes
  IF TG_OP = 'UPDATE' THEN
    -- If event_date_id changed, update both old and new dates
    IF OLD.event_date_id IS DISTINCT FROM NEW.event_date_id THEN
      -- Update old date
      IF OLD.event_date_id IS NOT NULL THEN
        UPDATE event_dates_times
        SET tickets_sold = (
          SELECT COUNT(*)
          FROM tickets
          WHERE event_date_id = OLD.event_date_id
            AND status = 'VALID'
        )
        WHERE id = OLD.event_date_id;
      END IF;
      
      -- Update new date
      IF NEW.event_date_id IS NOT NULL THEN
        UPDATE event_dates_times
        SET tickets_sold = (
          SELECT COUNT(*)
          FROM tickets
          WHERE event_date_id = NEW.event_date_id
            AND status = 'VALID'
        )
        WHERE id = NEW.event_date_id;
      END IF;
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      -- Status changed, update the date
      IF NEW.event_date_id IS NOT NULL THEN
        UPDATE event_dates_times
        SET tickets_sold = (
          SELECT COUNT(*)
          FROM tickets
          WHERE event_date_id = NEW.event_date_id
            AND status = 'VALID'
        )
        WHERE id = NEW.event_date_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tickets_sold
DROP TRIGGER IF EXISTS trigger_update_event_date_tickets_sold ON tickets;
CREATE TRIGGER trigger_update_event_date_tickets_sold
  AFTER INSERT OR UPDATE OR DELETE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_event_date_tickets_sold();

-- Initialize tickets_sold for existing dates
UPDATE event_dates_times edt
SET tickets_sold = (
  SELECT COUNT(*)
  FROM tickets t
  WHERE t.event_date_id = edt.id
    AND t.status = 'VALID'
);

-- Update comment to reflect new field name
COMMENT ON COLUMN event_dates_times.capacity IS 'Optional capacity for this specific date. If NULL, uses event capacity.';
COMMENT ON COLUMN event_dates_times.tickets_sold IS 'Number of valid tickets sold for this specific date. Auto-updated by trigger.';

