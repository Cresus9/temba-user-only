-- Insert admin interface translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.title', 'en', 'Admin Panel', 'admin'),
  ('admin.role', 'en', 'Administrator', 'admin'),
  ('admin.metrics.total_revenue', 'en', 'Total Revenue', 'admin'),
  ('admin.metrics.ticket_sales', 'en', 'Ticket Sales', 'admin'),
  ('admin.metrics.active_users', 'en', 'Active Users', 'admin'),
  ('admin.metrics.total_events', 'en', 'Total Events', 'admin'),
  ('admin.charts.revenue_overview', 'en', 'Revenue Overview', 'admin'),
  ('admin.charts.sales_by_category', 'en', 'Sales by Category', 'admin'),
  ('admin.charts.revenue', 'en', 'Revenue', 'admin'),
  ('admin.categories.music', 'en', 'Music', 'admin'),
  ('admin.categories.sports', 'en', 'Sports', 'admin'),
  ('admin.categories.cultural', 'en', 'Cultural', 'admin'),
  ('admin.categories.arts', 'en', 'Arts', 'admin'),
  ('admin.error.load_stats', 'en', 'Failed to load dashboard statistics', 'admin'),

  -- French translations
  ('admin.title', 'fr', 'Panneau d''Administration', 'admin'),
  ('admin.role', 'fr', 'Administrateur', 'admin'),
  ('admin.metrics.total_revenue', 'fr', 'Revenu Total', 'admin'),
  ('admin.metrics.ticket_sales', 'fr', 'Ventes de Billets', 'admin'),
  ('admin.metrics.active_users', 'fr', 'Utilisateurs Actifs', 'admin'),
  ('admin.metrics.total_events', 'fr', 'Total des Événements', 'admin'),
  ('admin.charts.revenue_overview', 'fr', 'Aperçu des Revenus', 'admin'),
  ('admin.charts.sales_by_category', 'fr', 'Ventes par Catégorie', 'admin'),
  ('admin.charts.revenue', 'fr', 'Revenu', 'admin'),
  ('admin.categories.music', 'fr', 'Musique', 'admin'),
  ('admin.categories.sports', 'fr', 'Sports', 'admin'),
  ('admin.categories.cultural', 'fr', 'Culturel', 'admin'),
  ('admin.categories.arts', 'fr', 'Arts', 'admin'),
  ('admin.error.load_stats', 'fr', 'Échec du chargement des statistiques', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;