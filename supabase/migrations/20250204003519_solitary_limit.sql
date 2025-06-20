-- First check and drop ALL existing policies
DO $$ 
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOR table_name, policy_name IN 
    SELECT schemaname || '.' || tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename IN ('support_categories', 'support_tickets', 'support_messages')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', policy_name, table_name);
  END LOOP;
END $$;

-- Enable RLS for all support tables
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "support_categories_view_policy_v2"
  ON support_categories FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "support_categories_admin_policy_v2"
  ON support_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Support Tickets Policies
CREATE POLICY "support_tickets_view_policy_v2"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "support_tickets_create_policy_v2"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "support_tickets_update_policy_v2"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Support Messages Policies
CREATE POLICY "support_messages_view_policy_v2"
  ON support_messages FOR SELECT
  TO authenticated
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

CREATE POLICY "support_messages_create_policy_v2"
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

-- Insert default support category if it doesn't exist
INSERT INTO support_categories (name, description)
VALUES ('Contact Form', 'Messages from contact form')
ON CONFLICT (name) DO NOTHING;

-- Create function to handle anonymous support tickets
CREATE OR REPLACE FUNCTION create_anonymous_support_ticket(
  p_name text,
  p_email text,
  p_subject text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category_id uuid;
  v_ticket_id uuid;
BEGIN
  -- Get or create the Contact Form category
  SELECT id INTO v_category_id
  FROM support_categories
  WHERE name = 'Contact Form';

  IF v_category_id IS NULL THEN
    INSERT INTO support_categories (name, description)
    VALUES ('Contact Form', 'Messages from contact form')
    RETURNING id INTO v_category_id;
  END IF;

  -- Create the ticket
  INSERT INTO support_tickets (
    subject,
    category_id,
    status,
    priority
  ) VALUES (
    p_subject,
    v_category_id,
    'OPEN',
    'MEDIUM'
  ) RETURNING id INTO v_ticket_id;

  -- Create the initial message
  INSERT INTO support_messages (
    ticket_id,
    message
  ) VALUES (
    v_ticket_id,
    format('Name: %s\nEmail: %s\n\n%s', p_name, p_email, p_message)
  );

  RETURN v_ticket_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION create_anonymous_support_ticket TO anon;
GRANT EXECUTE ON FUNCTION create_anonymous_support_ticket TO authenticated;