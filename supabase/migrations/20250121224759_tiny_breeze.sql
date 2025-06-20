-- Drop existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_messages_user_id_fkey'
    AND table_name = 'support_messages'
  ) THEN
    ALTER TABLE support_messages DROP CONSTRAINT support_messages_user_id_fkey;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON support_messages;

-- Enable RLS if not already enabled
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint
ALTER TABLE support_messages
  ADD CONSTRAINT support_messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Create policies for support messages
CREATE POLICY "Users can view messages for their tickets"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_support_messages_ticket_id;
DROP INDEX IF EXISTS idx_support_messages_user_id;
DROP INDEX IF EXISTS idx_support_messages_created_at;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);