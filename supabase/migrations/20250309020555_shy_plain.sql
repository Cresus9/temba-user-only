/*
  # Ticket Transfer System

  1. New Tables
    - `ticket_transfers`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, references tickets)
      - `sender_id` (uuid, references auth.users)
      - `recipient_id` (uuid, references auth.users)
      - `status` (text: PENDING, COMPLETED, REJECTED, CANCELLED)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `transfer_id` column to tickets table
    - Add RLS policies for ticket transfers
    - Add trigger to update ticket ownership on transfer completion

  3. Security
    - Enable RLS on ticket_transfers table
    - Add policies for transfer management
*/

-- Create ticket_transfers table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add transfer_id to tickets table if it doesn't exist
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
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "transfer_create_policy_v1" ON ticket_transfers;
  DROP POLICY IF EXISTS "transfer_view_policy_v1" ON ticket_transfers;
  DROP POLICY IF EXISTS "transfer_update_policy_v1" ON ticket_transfers;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

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
CREATE VIEW ticket_transfer_details AS
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
  ty.name as ticket_type_name,
  ty.price as ticket_type_price
FROM ticket_transfers tt
JOIN profiles s ON s.user_id = tt.sender_id
JOIN profiles r ON r.user_id = tt.recipient_id
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
JOIN ticket_types ty ON ty.id = t.ticket_type_id;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_transfer_complete ON ticket_transfers;
DROP FUNCTION IF EXISTS complete_ticket_transfer();

-- Create function to handle transfer completion
CREATE FUNCTION complete_ticket_transfer()
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
    ) VALUES (
      NEW.recipient_id,
      'Ticket Transfer Completed',
      'A ticket has been transferred to you',
      'INFO',
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'transfer_id', NEW.id
      )
    );
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