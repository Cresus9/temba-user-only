/*
  # Fix Ticket Transfers Schema

  1. Changes
    - Add proper foreign key relationships for ticket transfers
    - Update view for transfer details
    - Fix RLS policies
    - Add necessary indexes

  2. Security
    - Enable RLS
    - Add proper access policies
    - Maintain data integrity
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS ticket_transfer_details;

-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS ticket_transfers 
  DROP CONSTRAINT IF EXISTS ticket_transfers_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS ticket_transfers_recipient_id_fkey,
  DROP CONSTRAINT IF EXISTS ticket_transfers_ticket_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE ticket_transfers
  ADD CONSTRAINT ticket_transfers_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT ticket_transfers_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT ticket_transfers_ticket_id_fkey 
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_status 
ON ticket_transfers(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_status 
ON ticket_transfers(sender_id, status);

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "transfer_view_policy" ON ticket_transfers;
DROP POLICY IF EXISTS "transfer_create_policy" ON ticket_transfers;
DROP POLICY IF EXISTS "transfer_update_policy" ON ticket_transfers;

-- Create updated policies
CREATE POLICY "transfer_view_policy"
ON ticket_transfers FOR SELECT
TO public
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

CREATE POLICY "transfer_create_policy"
ON ticket_transfers FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_id
    AND tickets.user_id = auth.uid()
    AND tickets.status = 'VALID'
    AND tickets.transfer_id IS NULL
  )
);

CREATE POLICY "transfer_update_policy"
ON ticket_transfers FOR UPDATE
TO public
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

-- Function to handle transfer request notifications
CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_event_title text;
  v_sender_name text;
  v_ticket_type text;
BEGIN
  -- Get event title and sender name
  SELECT 
    e.title,
    p.name,
    tt.name
  INTO 
    v_event_title,
    v_sender_name,
    v_ticket_type
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN profiles p ON p.user_id = NEW.sender_id
  WHERE t.id = NEW.ticket_id;

  -- Insert notification for new transfer request
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    VALUES (
      NEW.recipient_id,
      'New Ticket Transfer Request',
      format(
        'You have received a ticket transfer request from %s for %s (%s)',
        v_sender_name,
        v_event_title,
        v_ticket_type
      ),
      'TRANSFER_REQUEST',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'event_title', v_event_title
      )
    );
  
  -- Insert notification for updated transfer request
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Notify sender of acceptance/rejection
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    VALUES (
      NEW.sender_id,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 'Transfer Request Accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Transfer Request Rejected'
        ELSE 'Transfer Request Updated'
      END,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 
          format('Your ticket transfer request for %s has been accepted', v_event_title)
        WHEN NEW.status = 'REJECTED' THEN 
          format('Your ticket transfer request for %s has been rejected', v_event_title)
        ELSE 
          format('Your ticket transfer request for %s has been updated', v_event_title)
      END,
      'TRANSFER_UPDATE',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'status', NEW.status,
        'event_title', v_event_title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace triggers
DROP TRIGGER IF EXISTS on_transfer_request_created ON ticket_transfers;
CREATE TRIGGER on_transfer_request_created
  AFTER INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();

DROP TRIGGER IF EXISTS on_transfer_request_updated ON ticket_transfers;
CREATE TRIGGER on_transfer_request_updated
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();

-- Function to complete ticket transfer
CREATE OR REPLACE FUNCTION complete_ticket_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to COMPLETED
  IF NEW.status = 'COMPLETED' AND OLD.status = 'PENDING' THEN
    -- Update ticket ownership and status
    UPDATE tickets
    SET 
      user_id = NEW.recipient_id,
      transfer_id = NEW.id,
      updated_at = NOW()
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transfer completion
DROP TRIGGER IF EXISTS on_transfer_complete ON ticket_transfers;
CREATE TRIGGER on_transfer_complete
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND OLD.status = 'PENDING')
  EXECUTE FUNCTION complete_ticket_transfer();