/*
  # Fix Landing Page Translations

  1. New Translations
    - Add missing translations for landing page sections
    - Add both English and French translations
    - Include hero, features, and footer sections

  2. Changes
    - Add translations for all section titles and descriptions
    - Add translations for search and navigation elements
    - Add translations for feature cards
*/

-- Insert English translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Hero section
  ('home.hero.title', 'en', 'Discover Amazing Events', 'common'),
  ('home.hero.subtitle', 'en', 'Find and book tickets for the best events across Africa', 'common'),
  ('home.hero.search.placeholder', 'en', 'Search events...', 'common'),
  ('home.hero.search.button', 'en', 'Search', 'common'),
  ('home.hero.location.placeholder', 'en', 'Select location', 'common'),

  -- Features section
  ('home.features.title', 'en', 'Why Choose AfriTix', 'common'),
  ('home.features.booking.title', 'en', 'Easy Booking', 'common'),
  ('home.features.booking.description', 'en', 'Book tickets in just a few clicks', 'common'),
  ('home.features.security.title', 'en', 'Secure Payments', 'common'),
  ('home.features.security.description', 'en', 'Your transactions are safe with us', 'common'),
  ('home.features.instant.title', 'en', 'Instant Delivery', 'common'),
  ('home.features.instant.description', 'en', 'Get your tickets immediately', 'common'),
  ('home.features.support.title', 'en', '24/7 Support', 'common'),
  ('home.features.support.description', 'en', 'We''re here to help anytime', 'common'),

  -- Featured events section
  ('home.featured.title', 'en', 'Featured Events', 'common'),
  ('home.featured.subtitle', 'en', 'Discover our handpicked selection of must-attend events', 'common'),
  ('home.featured.viewAll', 'en', 'View all events →', 'common'),

  -- Categories section
  ('home.categories.title', 'en', 'Browse by Category', 'common'),
  ('home.categories.subtitle', 'en', 'Find events that match your interests', 'common'),

  -- Footer sections
  ('footer.about', 'en', 'About AfriTix', 'common'),
  ('footer.contact', 'en', 'Contact Us', 'common'),
  ('footer.newsletter', 'en', 'Subscribe to Newsletter', 'common'),
  ('footer.rights', 'en', 'All rights reserved', 'common');

-- Insert French translations
INSERT INTO translations (key, locale, content, namespace)
VALUES
  -- Hero section
  ('home.hero.title', 'fr', 'Découvrez des Événements Incroyables', 'common'),
  ('home.hero.subtitle', 'fr', 'Trouvez et réservez des billets pour les meilleurs événements en Afrique', 'common'),
  ('home.hero.search.placeholder', 'fr', 'Rechercher des événements...', 'common'),
  ('home.hero.search.button', 'fr', 'Rechercher', 'common'),
  ('home.hero.location.placeholder', 'fr', 'Sélectionner un lieu', 'common'),

  -- Features section
  ('home.features.title', 'fr', 'Pourquoi Choisir AfriTix', 'common'),
  ('home.features.booking.title', 'fr', 'Réservation Facile', 'common'),
  ('home.features.booking.description', 'fr', 'Réservez vos billets en quelques clics', 'common'),
  ('home.features.security.title', 'fr', 'Paiements Sécurisés', 'common'),
  ('home.features.security.description', 'fr', 'Vos transactions sont sécurisées', 'common'),
  ('home.features.instant.title', 'fr', 'Livraison Instantanée', 'common'),
  ('home.features.instant.description', 'fr', 'Recevez vos billets immédiatement', 'common'),
  ('home.features.support.title', 'fr', 'Support 24/7', 'common'),
  ('home.features.support.description', 'fr', 'Nous sommes là pour vous aider', 'common'),

  -- Featured events section
  ('home.featured.title', 'fr', 'Événements à la Une', 'common'),
  ('home.featured.subtitle', 'fr', 'Découvrez notre sélection d''événements incontournables', 'common'),
  ('home.featured.viewAll', 'fr', 'Voir tous les événements →', 'common'),

  -- Categories section
  ('home.categories.title', 'fr', 'Parcourir par Catégorie', 'common'),
  ('home.categories.subtitle', 'fr', 'Trouvez des événements qui correspondent à vos intérêts', 'common'),

  -- Footer sections
  ('footer.about', 'fr', 'À Propos d''AfriTix', 'common'),
  ('footer.contact', 'fr', 'Contactez-nous', 'common'),
  ('footer.newsletter', 'fr', 'Abonnez-vous à la Newsletter', 'common'),
  ('footer.rights', 'fr', 'Tous droits réservés', 'common');