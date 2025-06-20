/*
  # Fix Ticket Transfer Queries

  1. Changes
    - Add indexes for better query performance
    - Enable RLS and add security policies
    - Add notification trigger for transfer requests

  2. Security
    - Enable RLS on ticket_transfers table
    - Add policies for proper access control
    - Ensure secure transfer validation
*/

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_status 
ON ticket_transfers(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_status 
ON ticket_transfers(sender_id, status);

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their transfer requests" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can create transfer requests" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can update their transfer requests" ON ticket_transfers;

-- Create new policies
CREATE POLICY "Users can view their transfer requests"
ON ticket_transfers FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

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

CREATE POLICY "Users can update their transfer requests"
ON ticket_transfers FOR UPDATE
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

-- Function to handle transfer request notifications
CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
BEGIN
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
      (SELECT 'Ticket transfer request from ' || name || ' for ' || e.title
       FROM profiles p
       JOIN tickets t ON t.id = NEW.ticket_id
       JOIN events e ON e.id = t.event_id
       WHERE p.user_id = NEW.sender_id),
      'TRANSFER_REQUEST',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id
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
        WHEN NEW.status = 'COMPLETED' THEN 'Your ticket transfer request has been accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Your ticket transfer request has been rejected'
        ELSE 'Your ticket transfer request has been updated'
      END,
      'TRANSFER_UPDATE',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'status', NEW.status
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