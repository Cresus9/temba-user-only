/*
  # Fix Navbar Translations

  1. New Translations
    - Add translations for all navbar items
    - Include both English and French translations
    - Cover main navigation and user menu items

  2. Changes
    - Add translations for main navigation links
    - Add translations for user dropdown menu
    - Add translations for authentication actions
*/

-- Insert English translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Main Navigation
  ('nav.events', 'en', 'Events', 'common'),
  ('nav.categories', 'en', 'Categories', 'common'),
  ('nav.login', 'en', 'Sign in', 'common'),
  ('nav.account', 'en', 'Account', 'common'),

  -- User Menu
  ('nav.dashboard', 'en', 'Dashboard', 'common'),
  ('nav.profile', 'en', 'Profile', 'common'),
  ('nav.admin', 'en', 'Admin Panel', 'common'),
  ('nav.organizer', 'en', 'Event Analytics', 'common'),
  ('nav.support', 'en', 'Support', 'common'),
  ('nav.logout', 'en', 'Sign out', 'common');

-- Insert French translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Main Navigation
  ('nav.events', 'fr', 'Événements', 'common'),
  ('nav.categories', 'fr', 'Catégories', 'common'),
  ('nav.login', 'fr', 'Connexion', 'common'),
  ('nav.account', 'fr', 'Compte', 'common'),

  -- User Menu
  ('nav.dashboard', 'fr', 'Tableau de bord', 'common'),
  ('nav.profile', 'fr', 'Profil', 'common'),
  ('nav.admin', 'fr', 'Administration', 'common'),
  ('nav.organizer', 'fr', 'Analyses d''événements', 'common'),
  ('nav.support', 'fr', 'Support', 'common'),
  ('nav.logout', 'fr', 'Déconnexion', 'common');