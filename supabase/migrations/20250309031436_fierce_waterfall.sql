/*
  # Fix Ticket Transfers and Views

  1. Changes
    - Drop existing view if exists
    - Create new view with correct joins
    - Add missing indexes
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for proper access control
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS ticket_transfer_details;

-- Create new ticket transfer details view with proper joins
CREATE OR REPLACE VIEW ticket_transfer_details AS
SELECT 
  tt.id,
  tt.ticket_id,
  tt.sender_id,
  tt.recipient_id,
  tt.status,
  tt.created_at,
  tt.updated_at,
  -- Sender details
  sp.name as sender_name,
  sp.email as sender_email,
  -- Event details
  t.event_id,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  -- Ticket type details
  t.ticket_type_id,
  tt_type.name as ticket_type_name,
  tt_type.price as ticket_type_price
FROM 
  ticket_transfers tt
  JOIN profiles sp ON tt.sender_id = sp.user_id
  JOIN tickets t ON tt.ticket_id = t.id
  JOIN events e ON t.event_id = e.id
  JOIN ticket_types tt_type ON t.ticket_type_id = tt_type.id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_status 
ON ticket_transfers(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_status 
ON ticket_transfers(sender_id, status);

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their transfer requests" ON ticket_transfers;
CREATE POLICY "Users can view their transfer requests"
ON ticket_transfers FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

DROP POLICY IF EXISTS "Users can create transfer requests" ON ticket_transfers;
CREATE POLICY "Users can create transfer requests"
ON ticket_transfers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_id
    AND tickets.user_id = auth.uid()
    AND tickets.status = 'VALID'
    AND tickets.transfer_id IS NULL
  )
);

DROP POLICY IF EXISTS "Users can update their transfer requests" ON ticket_transfers;
CREATE POLICY "Users can update their transfer requests"
ON ticket_transfers FOR UPDATE
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

-- Function to complete ticket transfer
CREATE OR REPLACE FUNCTION complete_ticket_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ticket ownership and status when transfer is completed
  IF NEW.status = 'COMPLETED' AND OLD.status = 'PENDING' THEN
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