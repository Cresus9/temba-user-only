-- Insert category translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English category translations
  ('categories.music-concerts.name', 'en', 'Music Concerts', 'categories'),
  ('categories.music-concerts.description', 'en', 'Live performances from top artists and bands', 'categories'),
  ('categories.cinema.name', 'en', 'Cinema', 'categories'),
  ('categories.cinema.description', 'en', 'Movie premieres and film festivals', 'categories'),
  ('categories.sports.name', 'en', 'Sports', 'categories'),
  ('categories.sports.description', 'en', 'Major sporting events and tournaments', 'categories'),
  ('categories.festivals.name', 'en', 'Festivals', 'categories'),
  ('categories.festivals.description', 'en', 'Cultural celebrations and festivals', 'categories'),

  -- French category translations
  ('categories.music-concerts.name', 'fr', 'Concerts', 'categories'),
  ('categories.music-concerts.description', 'fr', 'Performances live d''artistes et de groupes', 'categories'),
  ('categories.cinema.name', 'fr', 'Cinéma', 'categories'),
  ('categories.cinema.description', 'fr', 'Premières et festivals de films', 'categories'),
  ('categories.sports.name', 'fr', 'Sports', 'categories'),
  ('categories.sports.description', 'fr', 'Événements sportifs et tournois', 'categories'),
  ('categories.festivals.name', 'fr', 'Festivals', 'categories'),
  ('categories.festivals.description', 'fr', 'Célébrations culturelles et festivals', 'categories'),

  -- Subcategory translations
  ('categories.subcategories.afrobeats', 'en', 'Afrobeats', 'categories'),
  ('categories.subcategories.jazz', 'en', 'Jazz', 'categories'),
  ('categories.subcategories.gospel', 'en', 'Gospel', 'categories'),
  ('categories.subcategories.traditional', 'en', 'Traditional', 'categories'),
  ('categories.subcategories.premieres', 'en', 'Premieres', 'categories'),
  ('categories.subcategories.film-festivals', 'en', 'Film Festivals', 'categories'),
  ('categories.subcategories.independent-films', 'en', 'Independent Films', 'categories'),
  ('categories.subcategories.screenings', 'en', 'Screenings', 'categories'),

  ('categories.subcategories.afrobeats', 'fr', 'Afrobeats', 'categories'),
  ('categories.subcategories.jazz', 'fr', 'Jazz', 'categories'),
  ('categories.subcategories.gospel', 'fr', 'Gospel', 'categories'),
  ('categories.subcategories.traditional', 'fr', 'Traditionnel', 'categories'),
  ('categories.subcategories.premieres', 'fr', 'Premières', 'categories'),
  ('categories.subcategories.film-festivals', 'fr', 'Festivals de Films', 'categories'),
  ('categories.subcategories.independent-films', 'fr', 'Films Indépendants', 'categories'),
  ('categories.subcategories.screenings', 'fr', 'Projections', 'categories')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;