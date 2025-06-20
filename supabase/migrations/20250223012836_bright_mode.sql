-- Drop existing banners table and related objects
DROP TABLE IF EXISTS banners CASCADE;

-- Create banners table with proper structure
CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  description text,
  link text,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "banners_select_policy"
  ON banners FOR SELECT
  USING (
    active = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "banners_admin_policy"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_banners_locale ON banners(locale);
CREATE INDEX idx_banners_active ON banners(active);
CREATE INDEX idx_banners_display_order ON banners(display_order);
CREATE INDEX idx_banners_event_id ON banners(event_id);

-- Insert sample banners in English
INSERT INTO banners (title, image_url, description, display_order, active, locale) VALUES
  (
    'Afro Nation Burkina 2024',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
    'The biggest Afrobeats festival in Africa returns to Burkina Faso! Experience an incredible lineup of top African artists.',
    1,
    true,
    'en'
  ),
  (
    'Festival des Arts de Ouaga',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
    'A celebration of Burkinabe arts and culture featuring local and international artists.',
    2,
    true,
    'en'
  );

-- Insert French translations
INSERT INTO banners (title, image_url, description, display_order, active, locale) VALUES
  (
    'Afro Nation Burkina 2024',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
    'Le plus grand festival Afrobeats d''Afrique revient au Burkina Faso ! Découvrez une programmation incroyable d''artistes africains.',
    1,
    true,
    'fr'
  ),
  (
    'Festival des Arts de Ouaga',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
    'Une célébration des arts et de la culture burkinabè avec des artistes locaux et internationaux.',
    2,
    true,
    'fr'
  );