-- Insert admin interface translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.dashboard.title', 'en', 'Admin Dashboard', 'admin'),
  ('admin.events.title', 'en', 'Event Management', 'admin'),
  ('admin.users.title', 'en', 'User Management', 'admin'),
  ('admin.orders.title', 'en', 'Order Management', 'admin'),
  ('admin.analytics.title', 'en', 'Analytics', 'admin'),
  ('admin.content.title', 'en', 'Content Management', 'admin'),
  ('admin.support.title', 'en', 'Support Management', 'admin'),
  ('admin.security.title', 'en', 'Security Logs', 'admin'),
  ('admin.tickets.scanning', 'en', 'Ticket Scanning', 'admin'),
  ('admin.fraud.review', 'en', 'Fraud Review', 'admin'),

  -- French translations
  ('admin.dashboard.title', 'fr', 'Tableau de Bord Admin', 'admin'),
  ('admin.events.title', 'fr', 'Gestion des Événements', 'admin'),
  ('admin.users.title', 'fr', 'Gestion des Utilisateurs', 'admin'),
  ('admin.orders.title', 'fr', 'Gestion des Commandes', 'admin'),
  ('admin.analytics.title', 'fr', 'Analytiques', 'admin'),
  ('admin.content.title', 'fr', 'Gestion du Contenu', 'admin'),
  ('admin.support.title', 'fr', 'Gestion du Support', 'admin'),
  ('admin.security.title', 'fr', 'Journaux de Sécurité', 'admin'),
  ('admin.tickets.scanning', 'fr', 'Scan des Billets', 'admin'),
  ('admin.fraud.review', 'fr', 'Revue des Fraudes', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;