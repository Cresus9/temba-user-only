/*
  # Add Ticket Transfer System

  1. New Tables
    - `ticket_transfers`
      - Tracks ticket transfer requests between users
      - Includes status tracking (PENDING, COMPLETED, REJECTED, CANCELLED)
      - Links to tickets and users

  2. Changes
    - Added transfer_id column to tickets table
    - Created view for transfer details
    - Fixed notifications foreign key to use profiles.user_id

  3. Security
    - Enabled RLS on ticket_transfers table
    - Added policies for transfer management
    - Added triggers for transfer completion and notifications
*/

-- Create ticket_transfers table if not exists
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add transfer_id to tickets table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'transfer_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN transfer_id uuid REFERENCES ticket_transfers;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "transfer_create_policy_v1" ON ticket_transfers;
DROP POLICY IF EXISTS "transfer_view_policy_v1" ON ticket_transfers;
DROP POLICY IF EXISTS "transfer_update_policy_v1" ON ticket_transfers;

-- Create policies for ticket transfers
CREATE POLICY "transfer_create_policy_v1" ON ticket_transfers
FOR INSERT TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM tickets
  WHERE tickets.id = ticket_id
  AND tickets.user_id = auth.uid()
  AND tickets.status = 'VALID'
  AND tickets.transfer_id IS NULL
));

CREATE POLICY "transfer_view_policy_v1" ON ticket_transfers
FOR SELECT TO public
USING ((sender_id = auth.uid() OR recipient_id = auth.uid()));

CREATE POLICY "transfer_update_policy_v1" ON ticket_transfers
FOR UPDATE TO public
USING ((sender_id = auth.uid() OR recipient_id = auth.uid()));

-- Drop existing view if it exists
DROP VIEW IF EXISTS ticket_transfer_details;

-- Create view for transfer details
CREATE OR REPLACE VIEW ticket_transfer_details AS
SELECT 
  tt.id,
  tt.ticket_id,
  tt.sender_id,
  tt.recipient_id,
  tt.status,
  tt.created_at,
  tt.updated_at,
  s.name as sender_name,
  s.email as sender_email,
  r.name as recipient_name,
  r.email as recipient_email,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.id as event_id,
  ty.name as ticket_type_name,
  ty.price as ticket_type_price,
  ty.id as ticket_type_id
FROM ticket_transfers tt
JOIN profiles s ON s.user_id = tt.sender_id
JOIN profiles r ON r.user_id = tt.recipient_id
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
JOIN ticket_types ty ON ty.id = t.ticket_type_id;

-- Create function to handle transfer completion
CREATE OR REPLACE FUNCTION complete_ticket_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status = 'PENDING' THEN
    -- Update ticket ownership
    UPDATE tickets
    SET user_id = NEW.recipient_id,
        transfer_id = NEW.id,
        updated_at = now()
    WHERE id = NEW.ticket_id;
    
    -- Create notification for recipient
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    ) 
    SELECT
      NEW.recipient_id,
      'Ticket Transfer Completed',
      'A ticket has been transferred to you',
      'INFO',
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'transfer_id', NEW.id
      )
    FROM profiles
    WHERE user_id = NEW.recipient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle transfer request notification
CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Create notification for recipient
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    SELECT
      NEW.recipient_id,
      'New Ticket Transfer Request',
      'You have received a ticket transfer request',
      'INFO',
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'transfer_id', NEW.id
      )
    FROM profiles
    WHERE user_id = NEW.recipient_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Create notification for sender
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    SELECT
      NEW.sender_id,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 'Ticket Transfer Accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Ticket Transfer Rejected'
        ELSE 'Ticket Transfer Updated'
      END,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 'Your ticket transfer was accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Your ticket transfer was rejected'
        ELSE 'Your ticket transfer status was updated'
      END,
      'INFO',
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'transfer_id', NEW.id,
        'status', NEW.status
      )
    FROM profiles
    WHERE user_id = NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_transfer_complete ON ticket_transfers;
DROP TRIGGER IF EXISTS on_transfer_request_created ON ticket_transfers;
DROP TRIGGER IF EXISTS on_transfer_request_updated ON ticket_transfers;

-- Create triggers for transfer completion and notifications
CREATE TRIGGER on_transfer_complete
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND OLD.status = 'PENDING')
  EXECUTE FUNCTION complete_ticket_transfer();

CREATE TRIGGER on_transfer_request_created
  AFTER INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();

CREATE TRIGGER on_transfer_request_updated
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();