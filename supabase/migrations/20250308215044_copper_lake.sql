/*
  # Fix Admin Panel Translations

  1. New Translations
    - Add translations for all admin panel sections
    - Include both English and French translations
    - Cover all admin navigation items and titles

  2. Changes
    - Add translations for admin dashboard
    - Add translations for all admin sections
    - Add translations for common admin actions
*/

-- Insert English translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Admin Navigation
  ('admin.dashboard.title', 'en', 'Dashboard', 'admin'),
  ('admin.events.title', 'en', 'Event Management', 'admin'),
  ('admin.users.title', 'en', 'User Management', 'admin'),
  ('admin.orders.title', 'en', 'Order Management', 'admin'),
  ('admin.analytics.title', 'en', 'Analytics', 'admin'),
  ('admin.content.title', 'en', 'Content Management', 'admin'),
  ('admin.support.title', 'en', 'Support Management', 'admin'),
  ('admin.security.title', 'en', 'Security', 'admin'),
  ('admin.tickets.scanning', 'en', 'Ticket Scanning', 'admin'),
  ('admin.fraud.review', 'en', 'Fraud Review', 'admin'),
  ('admin.title', 'en', 'Admin Panel', 'admin');

-- Insert French translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Admin Navigation
  ('admin.dashboard.title', 'fr', 'Tableau de Bord', 'admin'),
  ('admin.events.title', 'fr', 'Gestion des Événements', 'admin'),
  ('admin.users.title', 'fr', 'Gestion des Utilisateurs', 'admin'),
  ('admin.orders.title', 'fr', 'Gestion des Commandes', 'admin'),
  ('admin.analytics.title', 'fr', 'Analyses', 'admin'),
  ('admin.content.title', 'fr', 'Gestion du Contenu', 'admin'),
  ('admin.support.title', 'fr', 'Gestion du Support', 'admin'),
  ('admin.security.title', 'fr', 'Sécurité', 'admin'),
  ('admin.tickets.scanning', 'fr', 'Scan des Billets', 'admin'),
  ('admin.fraud.review', 'fr', 'Révision des Fraudes', 'admin'),
  ('admin.title', 'fr', 'Panneau d''Administration', 'admin');