-- Create view for support message details
CREATE OR REPLACE VIEW support_message_details AS
SELECT 
  sm.*,
  p.name as user_name
FROM support_messages sm
LEFT JOIN profiles p ON p.user_id = sm.user_id;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON support_messages;

-- Create updated policies
CREATE POLICY "Users can view messages for their tickets"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND (
        support_tickets.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can create messages for their tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND (
        support_tickets.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role = 'ADMIN'
        )
      )
    )
  );

-- Create function to get user name
CREATE OR REPLACE FUNCTION get_user_name(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT name FROM profiles WHERE user_id = $1;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);