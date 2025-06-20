-- Drop existing table and related objects if they exist
DO $$ 
BEGIN
  -- Drop existing view if it exists
  DROP VIEW IF EXISTS ticket_transfer_details;

  -- Drop existing policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ticket_transfers' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "ticket_transfers_select_policy" ON ticket_transfers;
    DROP POLICY IF EXISTS "ticket_transfers_insert_policy" ON ticket_transfers;
    DROP POLICY IF EXISTS "ticket_transfers_update_policy" ON ticket_transfers;
    DROP POLICY IF EXISTS "Users can view their transfers" ON ticket_transfers;
    DROP POLICY IF EXISTS "Users can create transfers" ON ticket_transfers;
    DROP POLICY IF EXISTS "Users can update their transfers" ON ticket_transfers;
  END IF;

  -- Drop existing functions if they exist
  DROP FUNCTION IF EXISTS transfer_ticket(uuid, text);
  DROP FUNCTION IF EXISTS accept_ticket_transfer(uuid);

  -- Drop existing indexes if they exist
  DROP INDEX IF EXISTS idx_ticket_transfers_ticket_id;
  DROP INDEX IF EXISTS idx_ticket_transfers_sender_id;
  DROP INDEX IF EXISTS idx_ticket_transfers_recipient_id;
  DROP INDEX IF EXISTS idx_ticket_transfers_status;
  DROP INDEX IF EXISTS idx_tickets_transfer_id;

  -- Drop existing table if it exists
  DROP TABLE IF EXISTS ticket_transfers CASCADE;
END $$;

-- Create ticket_transfers table
CREATE TABLE ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add transfer_id to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES ticket_transfers(id);

-- Enable RLS
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
CREATE POLICY "transfer_view_policy_v1"
  ON ticket_transfers FOR SELECT
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

CREATE POLICY "transfer_create_policy_v1"
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

CREATE POLICY "transfer_update_policy_v1"
  ON ticket_transfers FOR UPDATE
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

-- Create function to handle ticket transfer
CREATE OR REPLACE FUNCTION transfer_ticket(
  p_ticket_id UUID,
  p_recipient_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_transfer_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_sender_id;
  
  -- Get recipient user ID
  SELECT user_id INTO v_recipient_id
  FROM profiles
  WHERE email = p_recipient_email;
  
  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;
  
  -- Check if ticket belongs to sender and is transferable
  IF NOT EXISTS (
    SELECT 1 FROM tickets
    WHERE id = p_ticket_id
    AND user_id = v_sender_id
    AND status = 'VALID'
    AND transfer_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid ticket or not available for transfer';
  END IF;
  
  -- Create transfer record
  INSERT INTO ticket_transfers (
    ticket_id,
    sender_id,
    recipient_id,
    status
  ) VALUES (
    p_ticket_id,
    v_sender_id,
    v_recipient_id,
    'PENDING'
  ) RETURNING id INTO v_transfer_id;
  
  RETURN v_transfer_id;
END;
$$;

-- Create function to accept ticket transfer
CREATE OR REPLACE FUNCTION accept_ticket_transfer(
  p_transfer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
  v_recipient_id UUID;
BEGIN
  -- Get transfer details
  SELECT 
    ticket_id,
    recipient_id INTO v_ticket_id, v_recipient_id
  FROM ticket_transfers
  WHERE id = p_transfer_id
  AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired transfer request';
  END IF;
  
  -- Verify recipient is current user
  IF v_recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Update transfer status
  UPDATE ticket_transfers
  SET 
    status = 'COMPLETED',
    updated_at = now()
  WHERE id = p_transfer_id;
  
  -- Update ticket ownership
  UPDATE tickets
  SET 
    user_id = v_recipient_id,
    transfer_id = p_transfer_id,
    updated_at = now()
  WHERE id = v_ticket_id;
  
  RETURN true;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX idx_ticket_transfers_sender_id ON ticket_transfers(sender_id);
CREATE INDEX idx_ticket_transfers_recipient_id ON ticket_transfers(recipient_id);
CREATE INDEX idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX idx_tickets_transfer_id ON tickets(transfer_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION transfer_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION accept_ticket_transfer TO authenticated;