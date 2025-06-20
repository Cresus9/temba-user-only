-- Drop existing banners table
DROP TABLE IF EXISTS banners CASCADE;

-- Create banners table with correct column names
CREATE TABLE banners (
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

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
CREATE INDEX idx_banners_display_order ON banners(display_order);
CREATE INDEX idx_banners_active ON banners(active);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample banners
INSERT INTO banners (title, image_url, description, display_order, active) VALUES
  ('Afro Nation Burkina 2024', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea', 'The biggest Afrobeats festival in Africa', 1, true),
  ('Cultural Festival', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Experience African culture', 2, true)
ON CONFLICT DO NOTHING;