-- Allow null recipient_id for pending transfers to non-registered users
ALTER TABLE public.ticket_transfers 
ALTER COLUMN recipient_id DROP NOT NULL;

-- Add a function to assign pending transfers when a user signs up
CREATE OR REPLACE FUNCTION assign_pending_transfers()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for pending transfers by email
  IF NEW.email IS NOT NULL THEN
    UPDATE ticket_transfers 
    SET recipient_id = NEW.id, status = 'COMPLETED'
    WHERE recipient_id IS NULL 
    AND recipient_email = NEW.email
    AND status = 'PENDING';
    
    -- Update ticket ownership
    UPDATE tickets 
    SET user_id = NEW.id, updated_at = NOW()
    WHERE id IN (
      SELECT ticket_id FROM ticket_transfers 
      WHERE recipient_id = NEW.id 
      AND recipient_email = NEW.email
    );
  END IF;
  
  -- Check for pending transfers by phone
  IF NEW.phone IS NOT NULL THEN
    UPDATE ticket_transfers 
    SET recipient_id = NEW.id, status = 'COMPLETED'
    WHERE recipient_id IS NULL 
    AND recipient_phone = NEW.phone
    AND status = 'PENDING';
    
    -- Update ticket ownership
    UPDATE tickets 
    SET user_id = NEW.id, updated_at = NOW()
    WHERE id IN (
      SELECT ticket_id FROM ticket_transfers 
      WHERE recipient_id = NEW.id 
      AND recipient_phone = NEW.phone
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to assign pending transfers when user signs up (drop if exists first)
DROP TRIGGER IF EXISTS assign_pending_transfers_trigger ON auth.users;
CREATE TRIGGER assign_pending_transfers_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_pending_transfers();

-- Update existing transfers to PENDING if recipient_id is null
UPDATE ticket_transfers 
SET status = 'PENDING' 
WHERE recipient_id IS NULL AND status = 'COMPLETED';
