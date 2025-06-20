-- Add home features translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('home.features.title', 'en', 'Why Choose AfriTix?', 'home'),
  ('home.features.booking.title', 'en', 'Easy Booking', 'home'),
  ('home.features.booking.description', 'en', 'Simple and secure ticket booking process', 'home'),
  ('home.features.security.title', 'en', 'Secure Payments', 'home'),
  ('home.features.security.description', 'en', 'Safe and reliable payment options', 'home'),
  ('home.features.instant.title', 'en', 'Instant Confirmation', 'home'),
  ('home.features.instant.description', 'en', 'Get your tickets delivered instantly', 'home'),
  ('home.features.support.title', 'en', '24/7 Support', 'home'),
  ('home.features.support.description', 'en', 'Dedicated customer support team', 'home'),

  -- French translations
  ('home.features.title', 'fr', 'Pourquoi Choisir AfriTix ?', 'home'),
  ('home.features.booking.title', 'fr', 'Réservation Facile', 'home'),
  ('home.features.booking.description', 'fr', 'Processus de réservation simple et sécurisé', 'home'),
  ('home.features.security.title', 'fr', 'Paiements Sécurisés', 'home'),
  ('home.features.security.description', 'fr', 'Options de paiement sûres et fiables', 'home'),
  ('home.features.instant.title', 'fr', 'Confirmation Instantanée', 'home'),
  ('home.features.instant.description', 'fr', 'Recevez vos billets instantanément', 'home'),
  ('home.features.support.title', 'fr', 'Support 24/7', 'home'),
  ('home.features.support.description', 'fr', 'Équipe de support client dédiée', 'home'),

  -- Footer translations
  ('footer.about', 'en', 'About', 'footer'),
  ('footer.support', 'en', 'Support', 'footer'),
  ('footer.contact', 'en', 'Contact', 'footer'),
  ('footer.terms', 'en', 'Terms', 'footer'),
  ('footer.privacy', 'en', 'Privacy', 'footer'),
  ('footer.newsletter', 'en', 'Subscribe to our newsletter', 'footer'),
  ('footer.rights', 'en', 'All rights reserved', 'footer'),

  ('footer.about', 'fr', 'À Propos', 'footer'),
  ('footer.support', 'fr', 'Support', 'footer'),
  ('footer.contact', 'fr', 'Contact', 'footer'),
  ('footer.terms', 'fr', 'Conditions', 'footer'),
  ('footer.privacy', 'fr', 'Confidentialité', 'footer'),
  ('footer.newsletter', 'fr', 'Abonnez-vous à notre newsletter', 'footer'),
  ('footer.rights', 'fr', 'Tous droits réservés', 'footer')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;