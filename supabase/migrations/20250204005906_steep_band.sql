-- Drop existing translations table if it exists
DROP TABLE IF EXISTS translations CASCADE;

-- Create translations table
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  content text NOT NULL,
  namespace text DEFAULT 'common',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, locale)
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "translations_select_policy"
  ON translations FOR SELECT
  USING (true);

CREATE POLICY "translations_admin_policy"
  ON translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_translations_key_locale ON translations(key, locale);
CREATE INDEX idx_translations_namespace ON translations(namespace);

-- Create function to get translation
CREATE OR REPLACE FUNCTION get_translation(p_key text, p_locale text DEFAULT 'en')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content text;
BEGIN
  -- Try to get translation in requested locale
  SELECT content INTO v_content
  FROM translations
  WHERE key = p_key AND locale = p_locale;
  
  -- Fall back to English if translation not found
  IF v_content IS NULL AND p_locale != 'en' THEN
    SELECT content INTO v_content
    FROM translations
    WHERE key = p_key AND locale = 'en';
  END IF;
  
  RETURN v_content;
END;
$$;

-- Insert translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- Home Page - English
  ('home.hero.title', 'en', 'Experience the Best Events Across Africa', 'home'),
  ('home.hero.subtitle', 'en', 'Discover and book tickets to concerts, festivals, cultural events, and more. Your gateway to unforgettable experiences.', 'home'),
  ('home.featured.title', 'en', 'Featured Events', 'home'),
  ('home.featured.viewAll', 'en', 'View all events', 'home'),
  ('home.features.title', 'en', 'Why Choose AfriTix?', 'home'),
  ('home.features.booking.title', 'en', 'Easy Booking', 'home'),
  ('home.features.booking.description', 'en', 'Simple and secure ticket booking process', 'home'),
  ('home.features.security.title', 'en', 'Secure Payments', 'home'),
  ('home.features.security.description', 'en', 'Safe and reliable payment options', 'home'),
  ('home.features.instant.title', 'en', 'Instant Confirmation', 'home'),
  ('home.features.instant.description', 'en', 'Get your tickets delivered instantly', 'home'),
  ('home.features.support.title', 'en', '24/7 Support', 'home'),
  ('home.features.support.description', 'en', 'Dedicated customer support team', 'home'),

  -- Home Page - French
  ('home.hero.title', 'fr', 'Vivez les Meilleurs Événements en Afrique', 'home'),
  ('home.hero.subtitle', 'fr', 'Découvrez et réservez des billets pour des concerts, festivals, événements culturels et plus encore. Votre passerelle vers des expériences inoubliables.', 'home'),
  ('home.featured.title', 'fr', 'Événements à la Une', 'home'),
  ('home.featured.viewAll', 'fr', 'Voir tous les événements', 'home'),
  ('home.features.title', 'fr', 'Pourquoi Choisir AfriTix ?', 'home'),
  ('home.features.booking.title', 'fr', 'Réservation Facile', 'home'),
  ('home.features.booking.description', 'fr', 'Processus de réservation simple et sécurisé', 'home'),
  ('home.features.security.title', 'fr', 'Paiements Sécurisés', 'home'),
  ('home.features.security.description', 'fr', 'Options de paiement sûres et fiables', 'home'),
  ('home.features.instant.title', 'fr', 'Confirmation Instantanée', 'home'),
  ('home.features.instant.description', 'fr', 'Recevez vos billets instantanément', 'home'),
  ('home.features.support.title', 'fr', 'Support 24/7', 'home'),
  ('home.features.support.description', 'fr', 'Équipe de support client dédiée', 'home')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;