-- Insert organizer dashboard translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('organizer.dashboard.title', 'en', 'Event Analytics', 'organizer'),
  
  -- Stats
  ('organizer.stats.total_revenue', 'en', 'Total Revenue', 'organizer'),
  ('organizer.stats.tickets_sold', 'en', 'Tickets Sold', 'organizer'),
  ('organizer.stats.total_orders', 'en', 'Total Orders', 'organizer'),
  ('organizer.stats.upcoming_events', 'en', 'Upcoming Events', 'organizer'),
  
  -- Event table
  ('organizer.events.title', 'en', 'Your Events', 'organizer'),
  ('organizer.events.table.event', 'en', 'Event', 'organizer'),
  ('organizer.events.table.date', 'en', 'Date', 'organizer'),
  ('organizer.events.table.tickets', 'en', 'Tickets', 'organizer'),
  ('organizer.events.table.revenue', 'en', 'Revenue', 'organizer'),
  ('organizer.events.table.status', 'en', 'Status', 'organizer'),
  
  -- Order status
  ('organizer.events.orders', 'en', '{count} orders', 'organizer'),
  ('organizer.events.completed_orders', 'en', '{count} completed', 'organizer'),
  ('organizer.events.pending_orders', 'en', '{count} pending', 'organizer'),
  ('organizer.events.cancelled_orders', 'en', '{count} cancelled', 'organizer'),
  
  -- Error messages
  ('organizer.error.load_analytics', 'en', 'Failed to load event analytics', 'organizer'),

  -- French translations
  ('organizer.dashboard.title', 'fr', 'Analytiques des Événements', 'organizer'),
  
  -- Stats
  ('organizer.stats.total_revenue', 'fr', 'Revenu Total', 'organizer'),
  ('organizer.stats.tickets_sold', 'fr', 'Billets Vendus', 'organizer'),
  ('organizer.stats.total_orders', 'fr', 'Total des Commandes', 'organizer'),
  ('organizer.stats.upcoming_events', 'fr', 'Événements à Venir', 'organizer'),
  
  -- Event table
  ('organizer.events.title', 'fr', 'Vos Événements', 'organizer'),
  ('organizer.events.table.event', 'fr', 'Événement', 'organizer'),
  ('organizer.events.table.date', 'fr', 'Date', 'organizer'),
  ('organizer.events.table.tickets', 'fr', 'Billets', 'organizer'),
  ('organizer.events.table.revenue', 'fr', 'Revenu', 'organizer'),
  ('organizer.events.table.status', 'fr', 'Statut', 'organizer'),
  
  -- Order status
  ('organizer.events.orders', 'fr', '{count} commandes', 'organizer'),
  ('organizer.events.completed_orders', 'fr', '{count} terminées', 'organizer'),
  ('organizer.events.pending_orders', 'fr', '{count} en attente', 'organizer'),
  ('organizer.events.cancelled_orders', 'fr', '{count} annulées', 'organizer'),
  
  -- Error messages
  ('organizer.error.load_analytics', 'fr', 'Échec du chargement des analytiques', 'organizer')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;