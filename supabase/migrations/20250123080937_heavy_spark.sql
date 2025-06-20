-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages for own tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can send messages" ON support_messages;

-- Update foreign key to reference profiles instead of auth.users
ALTER TABLE support_messages DROP CONSTRAINT IF EXISTS support_messages_user_id_fkey;
ALTER TABLE support_messages
  ADD CONSTRAINT support_messages_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Create view for support message details
CREATE OR REPLACE VIEW support_message_details AS
SELECT 
  sm.*,
  p.name as user_name,
  p.email as user_email,
  p.role as user_role
FROM support_messages sm
LEFT JOIN profiles p ON p.user_id = sm.user_id;

-- Create policies for support messages
CREATE POLICY "Users can view messages for own tickets"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can send messages"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
          AND role = 'ADMIN'
        )
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- Create function to update ticket's last reply timestamp
CREATE OR REPLACE FUNCTION update_ticket_last_reply()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets
  SET last_reply_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last reply timestamp
CREATE TRIGGER update_ticket_last_reply_timestamp
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_reply();