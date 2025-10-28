-- Create ticket_transfers table
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  to_email text,
  to_phone text,
  to_name text,
  message text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from_user_id ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_user_id ON ticket_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_email ON ticket_transfers(to_email);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_phone ON ticket_transfers(to_phone);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_created_at ON ticket_transfers(created_at);

-- Add RLS policies
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transfers they sent or received
CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
  FOR SELECT TO authenticated
  USING (
    from_user_id = auth.uid() OR 
    to_user_id = auth.uid() OR
    to_email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
    to_phone = (SELECT phone FROM profiles WHERE id = auth.uid())
  );

-- Policy: Users can create transfers for their own tickets
CREATE POLICY "ticket_transfers_insert_policy" ON ticket_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    ticket_id IN (
      SELECT id FROM tickets WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own transfers (for status changes)
CREATE POLICY "ticket_transfers_update_policy" ON ticket_transfers
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Add notification type for ticket transfers
INSERT INTO notification_types (type, name, description) VALUES 
  ('ticket_received', 'Ticket Received', 'Notification when a ticket is transferred to you'),
  ('ticket_sent', 'Ticket Sent', 'Notification when you transfer a ticket to someone')
ON CONFLICT (type) DO NOTHING;
