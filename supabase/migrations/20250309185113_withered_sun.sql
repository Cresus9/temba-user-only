/*
  # Fix Ticket Transfer System Relationships

  1. Changes
    - Add proper foreign key relationships for ticket transfers
    - Create ticket_transfer_details view with correct joins
    - Update RLS policies
    - Add notification handling

  2. Security
    - Enable RLS
    - Add proper access policies
    - Maintain data integrity with foreign key constraints
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS ticket_transfer_details;

-- Drop existing policies
DROP POLICY IF EXISTS "ticket_transfers_view_policy" ON ticket_transfers;
DROP POLICY IF EXISTS "ticket_transfers_create_policy" ON ticket_transfers;
DROP POLICY IF EXISTS "ticket_transfers_update_policy" ON ticket_transfers;

-- Drop existing triggers with their functions
DROP TRIGGER IF EXISTS on_transfer_request_created ON ticket_transfers;
DROP TRIGGER IF EXISTS on_transfer_request_updated ON ticket_transfers;
DROP TRIGGER IF EXISTS on_transfer_complete ON ticket_transfers;

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS handle_transfer_request_notification() CASCADE;
DROP FUNCTION IF EXISTS complete_ticket_transfer() CASCADE;

-- Modify ticket_transfers table
ALTER TABLE ticket_transfers
DROP CONSTRAINT IF EXISTS ticket_transfers_sender_id_fkey,
DROP CONSTRAINT IF EXISTS ticket_transfers_recipient_id_fkey;

-- Add proper foreign key relationships
ALTER TABLE ticket_transfers
ADD CONSTRAINT ticket_transfers_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
ADD CONSTRAINT ticket_transfers_recipient_id_fkey 
  FOREIGN KEY (recipient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Create ticket transfer details view
CREATE OR REPLACE VIEW ticket_transfer_details AS
SELECT 
  tt.id,
  tt.ticket_id,
  tt.sender_id,
  tt.recipient_id,
  tt.status,
  tt.created_at,
  sp.name as sender_name,
  sp.email as sender_email,
  rp.name as recipient_name,
  rp.email as recipient_email,
  t.event_id,
  t.ticket_type_id,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  tt2.name as ticket_type_name,
  tt2.price as ticket_type_price
FROM ticket_transfers tt
JOIN profiles sp ON sp.user_id = tt.sender_id
JOIN profiles rp ON rp.user_id = tt.recipient_id
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
JOIN ticket_types tt2 ON tt2.id = t.ticket_type_id;

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "ticket_transfers_view_policy"
ON ticket_transfers FOR SELECT
TO public
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

CREATE POLICY "ticket_transfers_create_policy"
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

CREATE POLICY "ticket_transfers_update_policy"
ON ticket_transfers FOR UPDATE
TO public
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
)
WITH CHECK (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

-- Function to handle transfer request notifications
CREATE FUNCTION handle_transfer_request_notification()
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

  -- Insert notification for recipient
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
CREATE TRIGGER on_transfer_request_created
  AFTER INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();

-- Function to complete ticket transfer
CREATE FUNCTION complete_ticket_transfer()
RETURNS TRIGGER AS $$
BEGIN
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
CREATE TRIGGER on_transfer_complete
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND OLD.status = 'PENDING')
  EXECUTE FUNCTION complete_ticket_transfer();