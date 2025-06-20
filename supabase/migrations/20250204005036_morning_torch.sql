-- Drop existing translations table if it exists
DROP TABLE IF EXISTS translations CASCADE;

-- Create translations table
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  content text NOT NULL,
  namespace text DEFAULT 'common',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, locale)
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "translations_select_policy"
  ON translations FOR SELECT
  USING (true);

CREATE POLICY "translations_admin_policy"
  ON translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_translations_key_locale ON translations(key, locale);
CREATE INDEX idx_translations_namespace ON translations(namespace);

-- Insert translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- Navigation
  ('nav.home', 'en', 'Home', 'navigation'),
  ('nav.events', 'en', 'Events', 'navigation'),
  ('nav.categories', 'en', 'Categories', 'navigation'),
  ('nav.login', 'en', 'Sign in', 'navigation'),
  ('nav.register', 'en', 'Sign up', 'navigation'),
  ('nav.dashboard', 'en', 'Dashboard', 'navigation'),
  ('nav.profile', 'en', 'Profile', 'navigation'),
  ('nav.support', 'en', 'Support', 'navigation'),
  ('nav.logout', 'en', 'Sign out', 'navigation'),
  ('nav.admin', 'en', 'Admin', 'navigation'),
  
  ('nav.home', 'fr', 'Accueil', 'navigation'),
  ('nav.events', 'fr', 'Événements', 'navigation'),
  ('nav.categories', 'fr', 'Catégories', 'navigation'),
  ('nav.login', 'fr', 'Se connecter', 'navigation'),
  ('nav.register', 'fr', 'S''inscrire', 'navigation'),
  ('nav.dashboard', 'fr', 'Tableau de bord', 'navigation'),
  ('nav.profile', 'fr', 'Profil', 'navigation'),
  ('nav.support', 'fr', 'Support', 'navigation'),
  ('nav.logout', 'fr', 'Se déconnecter', 'navigation'),
  ('nav.admin', 'fr', 'Administration', 'navigation'),

  -- Common Actions
  ('action.save', 'en', 'Save', 'common'),
  ('action.cancel', 'en', 'Cancel', 'common'),
  ('action.edit', 'en', 'Edit', 'common'),
  ('action.delete', 'en', 'Delete', 'common'),
  ('action.confirm', 'en', 'Confirm', 'common'),
  ('action.back', 'en', 'Back', 'common'),
  ('action.next', 'en', 'Next', 'common'),
  ('action.search', 'en', 'Search', 'common'),
  ('action.filter', 'en', 'Filter', 'common'),
  ('action.clear', 'en', 'Clear', 'common'),
  ('action.view', 'en', 'View', 'common'),
  ('action.download', 'en', 'Download', 'common'),
  ('action.share', 'en', 'Share', 'common'),

  ('action.save', 'fr', 'Enregistrer', 'common'),
  ('action.cancel', 'fr', 'Annuler', 'common'),
  ('action.edit', 'fr', 'Modifier', 'common'),
  ('action.delete', 'fr', 'Supprimer', 'common'),
  ('action.confirm', 'fr', 'Confirmer', 'common'),
  ('action.back', 'fr', 'Retour', 'common'),
  ('action.next', 'fr', 'Suivant', 'common'),
  ('action.search', 'fr', 'Rechercher', 'common'),
  ('action.filter', 'fr', 'Filtrer', 'common'),
  ('action.clear', 'fr', 'Effacer', 'common'),
  ('action.view', 'fr', 'Voir', 'common'),
  ('action.download', 'fr', 'Télécharger', 'common'),
  ('action.share', 'fr', 'Partager', 'common'),

  -- Footer
  ('footer.about', 'en', 'About Us', 'footer'),
  ('footer.terms', 'en', 'Terms of Service', 'footer'),
  ('footer.privacy', 'en', 'Privacy Policy', 'footer'),
  ('footer.contact', 'en', 'Contact Us', 'footer'),
  ('footer.support', 'en', 'Support', 'footer'),
  ('footer.newsletter', 'en', 'Subscribe to our newsletter', 'footer'),
  ('footer.rights', 'en', 'All rights reserved', 'footer'),

  ('footer.about', 'fr', 'À Propos', 'footer'),
  ('footer.terms', 'fr', 'Conditions d''Utilisation', 'footer'),
  ('footer.privacy', 'fr', 'Politique de Confidentialité', 'footer'),
  ('footer.contact', 'fr', 'Contactez-Nous', 'footer'),
  ('footer.support', 'fr', 'Support', 'footer'),
  ('footer.newsletter', 'fr', 'Abonnez-vous à notre newsletter', 'footer'),
  ('footer.rights', 'fr', 'Tous droits réservés', 'footer')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;