-- Insert carousel control translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('carousel.previous', 'en', 'Previous slide', 'common'),
  ('carousel.next', 'en', 'Next slide', 'common'),
  ('carousel.goto', 'en', 'Go to slide {number}', 'common'),
  ('carousel.current', 'en', 'Current slide', 'common'),
  ('carousel.navigation', 'en', 'Carousel navigation', 'common'),

  -- French translations
  ('carousel.previous', 'fr', 'Diapositive précédente', 'common'),
  ('carousel.next', 'fr', 'Diapositive suivante', 'common'),
  ('carousel.goto', 'fr', 'Aller à la diapositive {number}', 'common'),
  ('carousel.current', 'fr', 'Diapositive actuelle', 'common'),
  ('carousel.navigation', 'fr', 'Navigation du carrousel', 'common')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;