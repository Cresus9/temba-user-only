-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;

-- Update foreign key to reference profiles instead of auth.users
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Create view for support ticket details
CREATE OR REPLACE VIEW support_ticket_details AS
SELECT 
  st.*,
  p.name as user_name,
  p.email as user_email,
  sc.name as category_name,
  (
    SELECT COUNT(*) 
    FROM support_messages sm 
    WHERE sm.ticket_id = st.id
  ) as message_count,
  COALESCE(
    (
      SELECT MAX(created_at) 
      FROM support_messages sm 
      WHERE sm.ticket_id = st.id
    ),
    st.created_at
  ) as latest_activity
FROM support_tickets st
LEFT JOIN profiles p ON p.user_id = st.user_id
LEFT JOIN support_categories sc ON sc.id = st.category_id;

-- Create new policies
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);