/*
  # Fix Ticket Transfers Schema

  1. Changes
    - Add proper foreign key relationships for sender_id and recipient_id
    - Add RLS policies for ticket transfers
    - Add trigger to update ticket status on transfer completion
    - Add validation to prevent self-transfers

  2. Security
    - Enable RLS on ticket_transfers table
    - Add policies for creating and managing transfers
    - Ensure users can only transfer tickets they own
*/

-- Drop existing constraints and triggers to avoid conflicts
DO $$ 
BEGIN
  -- Drop foreign key constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ticket_transfers_sender_id_fkey') THEN
    ALTER TABLE ticket_transfers DROP CONSTRAINT ticket_transfers_sender_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ticket_transfers_recipient_id_fkey') THEN
    ALTER TABLE ticket_transfers DROP CONSTRAINT ticket_transfers_recipient_id_fkey;
  END IF;

  -- Drop triggers if they exist
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_transfer_complete') THEN
    DROP TRIGGER IF EXISTS on_transfer_complete ON ticket_transfers;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'before_transfer_request') THEN
    DROP TRIGGER IF EXISTS before_transfer_request ON ticket_transfers;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_transfer_request_created') THEN
    DROP TRIGGER IF EXISTS on_transfer_request_created ON ticket_transfers;
  END IF;

  -- Drop functions if they exist
  DROP FUNCTION IF EXISTS complete_ticket_transfer();
  DROP FUNCTION IF EXISTS validate_transfer_request();
  DROP FUNCTION IF EXISTS handle_transfer_request_notification();
END $$;

-- Add foreign key relationships
ALTER TABLE ticket_transfers
  ADD CONSTRAINT ticket_transfers_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE ticket_transfers
  ADD CONSTRAINT ticket_transfers_recipient_id_fkey 
  FOREIGN KEY (recipient_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create transfer requests for their tickets" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can view their transfers" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can update their transfers" ON ticket_transfers;

-- Create policies
CREATE POLICY "Users can create transfer requests for their tickets"
  ON ticket_transfers
  FOR INSERT
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

CREATE POLICY "Users can view their transfers"
  ON ticket_transfers
  FOR SELECT
  TO public
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can update their transfers"
  ON ticket_transfers
  FOR UPDATE
  TO public
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- Create functions
CREATE OR REPLACE FUNCTION complete_ticket_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ticket ownership and status
  UPDATE tickets
  SET 
    user_id = NEW.recipient_id,
    transfer_id = NEW.id,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_transfer_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-transfers
  IF NEW.sender_id = NEW.recipient_id THEN
    RAISE EXCEPTION 'Cannot transfer ticket to yourself';
  END IF;

  -- Check if ticket is available for transfer
  IF NOT EXISTS (
    SELECT 1 FROM tickets
    WHERE id = NEW.ticket_id
    AND user_id = NEW.sender_id
    AND status = 'VALID'
    AND transfer_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Ticket is not available for transfer';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    metadata
  )
  VALUES (
    NEW.recipient_id,
    'Ticket Transfer Request',
    'You have received a ticket transfer request',
    'TRANSFER_REQUEST',
    jsonb_build_object(
      'transfer_id', NEW.id,
      'ticket_id', NEW.ticket_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER on_transfer_complete
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' AND OLD.status = 'PENDING')
  EXECUTE FUNCTION complete_ticket_transfer();

CREATE TRIGGER before_transfer_request
  BEFORE INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION validate_transfer_request();

CREATE TRIGGER on_transfer_request_created
  AFTER INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();