-- Drop existing faqs table
DROP TABLE IF EXISTS faqs CASCADE;

-- Create faqs table with correct column names
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public users can view faqs"
  ON faqs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage faqs"
  ON faqs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_faqs_category ON faqs(category);
CREATE INDEX idx_faqs_display_order ON faqs(display_order);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample FAQs
INSERT INTO faqs (question, answer, category, display_order) VALUES
  ('How do I purchase tickets?', 'You can purchase tickets directly through our website by selecting an event and choosing your desired ticket type.', 'Tickets', 1),
  ('What payment methods do you accept?', 'We accept credit/debit cards and mobile money payments.', 'Payments', 1),
  ('Can I get a refund?', 'Refund policies vary by event. Please check the event details page for specific refund policies.', 'Tickets', 2),
  ('How do I contact support?', 'You can reach our support team through the Support section in your dashboard.', 'Support', 1)
ON CONFLICT DO NOTHING;