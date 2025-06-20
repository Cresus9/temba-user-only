-- Drop existing tables
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS faqs CASCADE;

-- Create pages table with camelCase column names
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  metaTitle text,
  metaDescription text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create banners table
CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  imageUrl text NOT NULL,
  link text,
  description text,
  displayOrder integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create faqs table
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  displayOrder integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for pages
CREATE POLICY "pages_select_policy"
  ON pages FOR SELECT
  USING (published = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

CREATE POLICY "pages_modify_policy"
  ON pages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

-- Create policies for banners
CREATE POLICY "banners_select_policy"
  ON banners FOR SELECT
  USING (active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

CREATE POLICY "banners_modify_policy"
  ON banners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

-- Create policies for faqs
CREATE POLICY "faqs_select_policy"
  ON faqs FOR SELECT
  USING (true);

CREATE POLICY "faqs_modify_policy"
  ON faqs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ));

-- Create indexes
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_published ON pages(published);
CREATE INDEX idx_banners_display_order ON banners(displayOrder);
CREATE INDEX idx_banners_active ON banners(active);
CREATE INDEX idx_faqs_category ON faqs(category);
CREATE INDEX idx_faqs_display_order ON faqs(displayOrder);

-- Create function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(title text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+',
      '-',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug
CREATE OR REPLACE FUNCTION set_page_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_page_slug_trigger
  BEFORE INSERT OR UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION set_page_slug();

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO pages (title, content, published) VALUES
  ('About Us', 'AfriTix is the leading event ticketing platform in Africa...', true),
  ('Terms of Service', 'Please read these terms of service carefully...', true),
  ('Privacy Policy', 'Your privacy is important to us...', true),
  ('Contact Us', 'Get in touch with our team...', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO banners (title, imageUrl, description, displayOrder, active) VALUES
  ('Afro Nation Burkina 2024', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea', 'The biggest Afrobeats festival in Africa', 1, true),
  ('Cultural Festival', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Experience African culture', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO faqs (question, answer, category, displayOrder) VALUES
  ('How do I purchase tickets?', 'You can purchase tickets directly through our website by selecting an event and choosing your desired ticket type.', 'Tickets', 1),
  ('What payment methods do you accept?', 'We accept credit/debit cards and mobile money payments.', 'Payments', 1),
  ('Can I get a refund?', 'Refund policies vary by event. Please check the event details page for specific refund policies.', 'Tickets', 2),
  ('How do I contact support?', 'You can reach our support team through the Support section in your dashboard.', 'Support', 1)
ON CONFLICT DO NOTHING;