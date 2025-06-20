-- Insert additional category translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- Category event count translations
  ('categories.event_count', 'en', '{count} Events Available', 'categories'),
  ('categories.event_count', 'fr', '{count} Événements Disponibles', 'categories'),

  -- View events button translations
  ('category.events.view', 'en', 'View Events', 'categories'),
  ('category.events.view', 'fr', 'Voir les Événements', 'categories'),

  -- Additional subcategory translations
  ('categories.subcategories.football', 'en', 'Football', 'categories'),
  ('categories.subcategories.basketball', 'en', 'Basketball', 'categories'),
  ('categories.subcategories.athletics', 'en', 'Athletics', 'categories'),
  ('categories.subcategories.boxing', 'en', 'Boxing', 'categories'),
  ('categories.subcategories.cultural', 'en', 'Cultural', 'categories'),
  ('categories.subcategories.food', 'en', 'Food', 'categories'),
  ('categories.subcategories.art', 'en', 'Art', 'categories'),
  ('categories.subcategories.music', 'en', 'Music', 'categories'),

  ('categories.subcategories.football', 'fr', 'Football', 'categories'),
  ('categories.subcategories.basketball', 'fr', 'Basketball', 'categories'),
  ('categories.subcategories.athletics', 'fr', 'Athlétisme', 'categories'),
  ('categories.subcategories.boxing', 'fr', 'Boxe', 'categories'),
  ('categories.subcategories.cultural', 'fr', 'Culturel', 'categories'),
  ('categories.subcategories.food', 'fr', 'Gastronomie', 'categories'),
  ('categories.subcategories.art', 'fr', 'Art', 'categories'),
  ('categories.subcategories.music', 'fr', 'Musique', 'categories')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;