-- Insert category translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English category translations
  ('categories.title', 'en', 'Event Categories', 'categories'),
  ('categories.description', 'en', 'Discover events by category. From music concerts to sports events, find experiences that match your interests.', 'categories'),
  ('categories.search.placeholder', 'en', 'Search categories...', 'categories'),
  ('categories.music.name', 'en', 'Music Concerts', 'categories'),
  ('categories.music.description', 'en', 'Live performances from top artists and bands', 'categories'),
  ('categories.sports.name', 'en', 'Sports', 'categories'),
  ('categories.sports.description', 'en', 'Sporting events and tournaments', 'categories'),
  ('categories.arts.name', 'en', 'Arts', 'categories'),
  ('categories.arts.description', 'en', 'Art exhibitions and cultural events', 'categories'),
  ('categories.cultural.name', 'en', 'Cultural', 'categories'),
  ('categories.cultural.description', 'en', 'Traditional and cultural celebrations', 'categories'),

  -- French category translations
  ('categories.title', 'fr', 'Catégories d''Événements', 'categories'),
  ('categories.description', 'fr', 'Découvrez les événements par catégorie. Des concerts aux événements sportifs, trouvez des expériences qui correspondent à vos intérêts.', 'categories'),
  ('categories.search.placeholder', 'fr', 'Rechercher des catégories...', 'categories'),
  ('categories.music.name', 'fr', 'Concerts', 'categories'),
  ('categories.music.description', 'fr', 'Performances live d''artistes et de groupes', 'categories'),
  ('categories.sports.name', 'fr', 'Sports', 'categories'),
  ('categories.sports.description', 'fr', 'Événements sportifs et tournois', 'categories'),
  ('categories.arts.name', 'fr', 'Arts', 'categories'),
  ('categories.arts.description', 'fr', 'Expositions d''art et événements culturels', 'categories'),
  ('categories.cultural.name', 'fr', 'Culture', 'categories'),
  ('categories.cultural.description', 'fr', 'Célébrations traditionnelles et culturelles', 'categories'),

  -- Category page translations
  ('category.events.title', 'en', '{category} Events', 'categories'),
  ('category.events.empty', 'en', 'No events in this category', 'categories'),
  ('category.events.back', 'en', 'Back to Categories', 'categories'),

  ('category.events.title', 'fr', 'Événements {category}', 'categories'),
  ('category.events.empty', 'fr', 'Aucun événement dans cette catégorie', 'categories'),
  ('category.events.back', 'fr', 'Retour aux Catégories', 'categories')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;