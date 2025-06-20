/*
  # Add Support System

  1. Tables
    - Support Tickets: Track user support requests
    - Support Messages: Store conversation messages
    - Support Categories: Categorize support tickets

  2. Security
    - Enable RLS
    - Add appropriate policies
    - Ensure admin access

  3. Indexes & Functions
    - Add performance indexes
    - Add status update functions
*/

-- Support Categories Table
CREATE TABLE IF NOT EXISTS support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  category_id uuid REFERENCES support_categories ON DELETE SET NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  last_reply_at timestamptz
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  message text NOT NULL,
  is_staff_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Support Categories Policies
CREATE POLICY "Anyone can view support categories"
  ON support_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage support categories"
  ON support_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Support Tickets Policies
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

-- Support Messages Policies
CREATE POLICY "Users can view messages for own tickets"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND (support_tickets.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'ADMIN'
      ))
    )
  );

CREATE POLICY "Users can send messages to own tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND (support_tickets.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'ADMIN'
      ))
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON support_messages(created_at);

-- Function to update ticket status
CREATE OR REPLACE FUNCTION update_ticket_status()
RETURNS trigger AS $$
BEGIN
  UPDATE support_tickets
  SET 
    updated_at = now(),
    last_reply_at = now()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket updates
CREATE TRIGGER update_ticket_on_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status();

-- Insert default support categories
INSERT INTO support_categories (name, description) VALUES
  ('General', 'General inquiries and questions'),
  ('Technical', 'Technical issues and bugs'),
  ('Billing', 'Payment and billing related issues'),
  ('Account', 'Account management and access'),
  ('Event', 'Event-related questions and issues')
ON CONFLICT (name) DO NOTHING;