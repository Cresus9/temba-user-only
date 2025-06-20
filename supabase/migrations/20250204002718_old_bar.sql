-- First drop all existing policies
DO $$ 
BEGIN
  -- Drop policies from support_categories if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_categories' AND policyname = 'Anyone can view support categories'
  ) THEN
    DROP POLICY "Anyone can view support categories" ON support_categories;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_categories' AND policyname = 'Admins can manage support categories'
  ) THEN
    DROP POLICY "Admins can manage support categories" ON support_categories;
  END IF;

  -- Drop policies from support_tickets if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_tickets' AND policyname = 'Users can view own tickets'
  ) THEN
    DROP POLICY "Users can view own tickets" ON support_tickets;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_tickets' AND policyname = 'Users can create tickets'
  ) THEN
    DROP POLICY "Users can create tickets" ON support_tickets;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_tickets' AND policyname = 'Users can update own tickets'
  ) THEN
    DROP POLICY "Users can update own tickets" ON support_tickets;
  END IF;

  -- Drop policies from support_messages if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_messages' AND policyname = 'Users can view messages for own tickets'
  ) THEN
    DROP POLICY "Users can view messages for own tickets" ON support_messages;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'support_messages' AND policyname = 'Users can send messages'
  ) THEN
    DROP POLICY "Users can send messages" ON support_messages;
  END IF;
END $$;

-- Enable RLS for all support tables
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "support_categories_select_policy"
  ON support_categories FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "support_categories_admin_policy"
  ON support_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "support_tickets_select_policy"
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

CREATE POLICY "support_tickets_insert_policy"
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

CREATE POLICY "support_tickets_update_policy"
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

CREATE POLICY "support_messages_select_policy"
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

CREATE POLICY "support_messages_insert_policy"
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