/*
  # Fix Ticket Transfer View and Relationships

  1. Changes
    - Drop existing ticket_transfer_details view if exists
    - Create new ticket_transfer_details view with proper joins
    - Add missing indexes for performance

  2. Security
    - Add RLS policies for transfer requests
    - Ensure proper access control for senders and recipients
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
  sender.name as sender_name,
  sender.email as sender_email,
  -- Event details
  e.id as event_id,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  -- Ticket type details
  ttype.id as ticket_type_id,
  ttype.name as ticket_type_name,
  ttype.price as ticket_type_price
FROM 
  ticket_transfers tt
  JOIN profiles sender ON tt.sender_id = sender.user_id
  JOIN tickets t ON tt.ticket_id = t.id
  JOIN events e ON t.event_id = e.id
  JOIN ticket_types ttype ON t.ticket_type_id = ttype.id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_status 
ON ticket_transfers(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_status 
ON ticket_transfers(sender_id, status);

-- Update RLS policies
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Policy for viewing transfer requests
CREATE POLICY "Users can view their transfer requests"
ON ticket_transfers
FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);

-- Policy for creating transfer requests
CREATE POLICY "Users can create transfer requests for their tickets"
ON ticket_transfers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_id
    AND tickets.user_id = auth.uid()
    AND tickets.status = 'VALID'
    AND tickets.transfer_id IS NULL
  )
);

-- Policy for updating transfer requests
CREATE POLICY "Users can update their transfer requests"
ON ticket_transfers
FOR UPDATE
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);