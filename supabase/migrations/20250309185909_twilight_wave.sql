/*
  # Fix Ticket Transfer Relationships

  1. Changes
    - Add foreign key relationships for ticket transfers table
    - Update RLS policies for ticket transfers
    - Add indexes for better query performance

  2. Security
    - Enable RLS on ticket_transfers table
    - Add policies for transfer management
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_transfers_sender_id_fkey'
  ) THEN
    ALTER TABLE ticket_transfers DROP CONSTRAINT ticket_transfers_sender_id_fkey;
  END IF;
END $$;

-- Add foreign key relationships
ALTER TABLE ticket_transfers
  ADD CONSTRAINT ticket_transfers_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_id ON ticket_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_id ON ticket_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON ticket_transfers(status);

-- Update RLS policies
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Policy for creating transfer requests
CREATE POLICY "Users can create transfer requests for their tickets"
ON ticket_transfers
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_transfers.ticket_id
    AND tickets.user_id = auth.uid()
    AND tickets.status = 'VALID'
    AND tickets.transfer_id IS NULL
  )
);

-- Policy for viewing transfer requests
CREATE POLICY "Users can view their transfers"
ON ticket_transfers
FOR SELECT
TO public
USING (
  sender_id = auth.uid() OR 
  recipient_id = auth.uid()
);

-- Policy for updating transfer requests
CREATE POLICY "Users can update their transfers"
ON ticket_transfers
FOR UPDATE
TO public
USING (
  sender_id = auth.uid() OR 
  recipient_id = auth.uid()
)
WITH CHECK (
  sender_id = auth.uid() OR 
  recipient_id = auth.uid()
);