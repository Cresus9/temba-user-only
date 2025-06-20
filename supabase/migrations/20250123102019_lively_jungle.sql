-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_page_slug_trigger ON pages;
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
DROP TRIGGER IF EXISTS update_faqs_updated_at ON faqs;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_slug(text);
DROP FUNCTION IF EXISTS set_page_slug();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_pages_slug;
DROP INDEX IF EXISTS idx_pages_published;
DROP INDEX IF EXISTS idx_banners_display_order;
DROP INDEX IF EXISTS idx_banners_active;
DROP INDEX IF EXISTS idx_faqs_category;
DROP INDEX IF EXISTS idx_faqs_display_order;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public users can view published pages" ON pages;
DROP POLICY IF EXISTS "Admins can manage pages" ON pages;
DROP POLICY IF EXISTS "Public users can view active banners" ON banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
DROP POLICY IF EXISTS "Public users can view faqs" ON faqs;
DROP POLICY IF EXISTS "Admins can manage faqs" ON faqs;

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  meta_title text,
  meta_description text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for pages
CREATE POLICY "Public users can view published pages"
  ON pages FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage pages"
  ON pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create policies for banners
CREATE POLICY "Public users can view active banners"
  ON banners FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create policies for faqs
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
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(display_order);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(active);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);

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

INSERT INTO banners (title, image_url, description, display_order, active) VALUES
  ('Afro Nation Burkina 2024', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea', 'The biggest Afrobeats festival in Africa', 1, true),
  ('Cultural Festival', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Experience African culture', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO faqs (question, answer, category, display_order) VALUES
  ('How do I purchase tickets?', 'You can purchase tickets directly through our website by selecting an event and choosing your desired ticket type.', 'Tickets', 1),
  ('What payment methods do you accept?', 'We accept credit/debit cards and mobile money payments.', 'Payments', 1),
  ('Can I get a refund?', 'Refund policies vary by event. Please check the event details page for specific refund policies.', 'Tickets', 2),
  ('How do I contact support?', 'You can reach our support team through the Support section in your dashboard.', 'Support', 1)
ON CONFLICT DO NOTHING;