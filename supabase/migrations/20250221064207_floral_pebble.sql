-- Insert dashboard translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('dashboard.welcome', 'en', 'Welcome back, {name}! 👋', 'dashboard'),
  ('dashboard.welcome.subtitle', 'en', 'Track your events, tickets, and bookings all in one place', 'dashboard'),
  ('dashboard.browse_events', 'en', 'Browse Events', 'dashboard'),
  ('dashboard.get_support', 'en', 'Get Support', 'dashboard'),
  
  -- Stats section
  ('dashboard.stats.upcoming_events', 'en', 'Upcoming Events', 'dashboard'),
  ('dashboard.stats.total_tickets', 'en', 'Total Tickets', 'dashboard'),
  ('dashboard.stats.total_spent', 'en', 'Total Spent', 'dashboard'),
  ('dashboard.stats.active', 'en', 'Active', 'dashboard'),
  
  -- Recent orders section
  ('dashboard.orders.title', 'en', 'Recent Orders', 'dashboard'),
  ('dashboard.orders.view_all', 'en', 'View All', 'dashboard'),
  ('dashboard.orders.empty.title', 'en', 'No Orders Yet', 'dashboard'),
  ('dashboard.orders.empty.description', 'en', 'Start exploring events and make your first booking', 'dashboard'),
  ('dashboard.orders.status.completed', 'en', 'Completed', 'dashboard'),
  ('dashboard.orders.status.pending', 'en', 'Pending', 'dashboard'),
  ('dashboard.orders.status.cancelled', 'en', 'Cancelled', 'dashboard'),

  -- French translations
  ('dashboard.welcome', 'fr', 'Bon retour, {name}! 👋', 'dashboard'),
  ('dashboard.welcome.subtitle', 'fr', 'Suivez vos événements, billets et réservations en un seul endroit', 'dashboard'),
  ('dashboard.browse_events', 'fr', 'Parcourir les Événements', 'dashboard'),
  ('dashboard.get_support', 'fr', 'Obtenir de l''Aide', 'dashboard'),
  
  -- Stats section
  ('dashboard.stats.upcoming_events', 'fr', 'Événements à Venir', 'dashboard'),
  ('dashboard.stats.total_tickets', 'fr', 'Total des Billets', 'dashboard'),
  ('dashboard.stats.total_spent', 'fr', 'Total Dépensé', 'dashboard'),
  ('dashboard.stats.active', 'fr', 'Actif', 'dashboard'),
  
  -- Recent orders section
  ('dashboard.orders.title', 'fr', 'Commandes Récentes', 'dashboard'),
  ('dashboard.orders.view_all', 'fr', 'Voir Tout', 'dashboard'),
  ('dashboard.orders.empty.title', 'fr', 'Pas Encore de Commandes', 'dashboard'),
  ('dashboard.orders.empty.description', 'fr', 'Commencez à explorer les événements et faites votre première réservation', 'dashboard'),
  ('dashboard.orders.status.completed', 'fr', 'Terminée', 'dashboard'),
  ('dashboard.orders.status.pending', 'fr', 'En Attente', 'dashboard'),
  ('dashboard.orders.status.cancelled', 'fr', 'Annulée', 'dashboard')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;