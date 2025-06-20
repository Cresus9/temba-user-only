-- Insert organizer interface translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('organizer.portal.title', 'en', 'Organizer Portal', 'organizer'),
  ('organizer.nav.dashboard', 'en', 'Dashboard', 'organizer'),
  ('organizer.nav.events', 'en', 'Events', 'organizer'),
  ('organizer.nav.attendees', 'en', 'Attendees', 'organizer'),
  ('organizer.nav.sales', 'en', 'Sales', 'organizer'),
  ('organizer.nav.venues', 'en', 'Venues', 'organizer'),
  
  ('organizer.events.title', 'en', 'Event Management', 'organizer'),
  ('organizer.attendees.title', 'en', 'Attendee Management', 'organizer'),
  ('organizer.sales.title', 'en', 'Sales Report', 'organizer'),
  ('organizer.venues.title', 'en', 'Venue Management', 'organizer'),

  -- French translations  
  ('organizer.portal.title', 'fr', 'Portail Organisateur', 'organizer'),
  ('organizer.nav.dashboard', 'fr', 'Tableau de Bord', 'organizer'),
  ('organizer.nav.events', 'fr', 'Événements', 'organizer'),
  ('organizer.nav.attendees', 'fr', 'Participants', 'organizer'),
  ('organizer.nav.sales', 'fr', 'Ventes', 'organizer'),
  ('organizer.nav.venues', 'fr', 'Lieux', 'organizer'),
  
  ('organizer.events.title', 'fr', 'Gestion des Événements', 'organizer'),
  ('organizer.attendees.title', 'fr', 'Gestion des Participants', 'organizer'),
  ('organizer.sales.title', 'fr', 'Rapport des Ventes', 'organizer'),
  ('organizer.venues.title', 'fr', 'Gestion des Lieux', 'organizer')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;