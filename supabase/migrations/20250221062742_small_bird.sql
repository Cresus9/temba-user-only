-- Insert event page translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('events.title', 'en', 'Discover Events', 'events'),
  ('events.description', 'en', 'Find and book tickets for the best events near you', 'events'),
  ('events.search.placeholder', 'en', 'Search events...', 'events'),
  ('events.filters.all_locations', 'en', 'All Locations', 'events'),
  ('events.filters.all_categories', 'en', 'All Categories', 'events'),
  ('events.filters.clear', 'en', 'Clear Filters', 'events'),
  ('events.no_events.title', 'en', 'No events found', 'events'),
  ('events.no_events.description', 'en', 'Try adjusting your filters or search terms', 'events'),
  ('error.load_events', 'en', 'Failed to load events', 'events'),

  -- French translations
  ('events.title', 'fr', 'Découvrir les Événements', 'events'),
  ('events.description', 'fr', 'Trouvez et réservez des billets pour les meilleurs événements près de chez vous', 'events'),
  ('events.search.placeholder', 'fr', 'Rechercher des événements...', 'events'),
  ('events.filters.all_locations', 'fr', 'Toutes les Villes', 'events'),
  ('events.filters.all_categories', 'fr', 'Toutes les Catégories', 'events'),
  ('events.filters.clear', 'fr', 'Effacer les Filtres', 'events'),
  ('events.no_events.title', 'fr', 'Aucun événement trouvé', 'events'),
  ('events.no_events.description', 'fr', 'Essayez d''ajuster vos filtres ou vos termes de recherche', 'events'),
  ('error.load_events', 'fr', 'Échec du chargement des événements', 'events')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;