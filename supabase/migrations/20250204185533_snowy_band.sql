-- Add hero section translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- Hero section - English
  ('home.hero.title', 'en', 'Experience the Best Events Across Africa', 'home'),
  ('home.hero.subtitle', 'en', 'Discover and book tickets to concerts, festivals, cultural events, and more. Your gateway to unforgettable experiences.', 'home'),
  ('home.hero.search.placeholder', 'en', 'Search events...', 'home'),
  ('home.hero.search.button', 'en', 'Search', 'home'),
  ('home.hero.location.placeholder', 'en', 'All Locations', 'home'),

  -- Hero section - French
  ('home.hero.title', 'fr', 'Vivez les Meilleurs Événements en Afrique', 'home'),
  ('home.hero.subtitle', 'fr', 'Découvrez et réservez des billets pour des concerts, festivals, événements culturels et plus encore. Votre passerelle vers des expériences inoubliables.', 'home'),
  ('home.hero.search.placeholder', 'fr', 'Rechercher des événements...', 'home'),
  ('home.hero.search.button', 'fr', 'Rechercher', 'home'),
  ('home.hero.location.placeholder', 'fr', 'Toutes les Villes', 'home'),

  -- Featured section - English
  ('home.featured.title', 'en', 'Featured Events', 'home'),
  ('home.featured.viewAll', 'en', 'View all events →', 'home'),
  ('home.featured.empty', 'en', 'No featured events at the moment', 'home'),

  -- Featured section - French
  ('home.featured.title', 'fr', 'Événements à la Une', 'home'),
  ('home.featured.viewAll', 'fr', 'Voir tous les événements →', 'home'),
  ('home.featured.empty', 'fr', 'Aucun événement à la une pour le moment', 'home')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;