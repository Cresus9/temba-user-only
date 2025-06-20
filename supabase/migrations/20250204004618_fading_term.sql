-- Drop existing translations table if it exists
DROP TABLE IF EXISTS translations CASCADE;

-- Create translations table
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL,
  content text NOT NULL,
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

-- Insert translations
INSERT INTO translations (key, locale, content) VALUES
  -- Navigation - English
  ('nav.home', 'en', 'Home'),
  ('nav.events', 'en', 'Events'),
  ('nav.categories', 'en', 'Categories'),
  ('nav.login', 'en', 'Sign in'),
  ('nav.register', 'en', 'Sign up'),
  ('nav.dashboard', 'en', 'Dashboard'),
  ('nav.profile', 'en', 'Profile'),
  ('nav.support', 'en', 'Support'),
  ('nav.logout', 'en', 'Sign out'),
  ('nav.admin', 'en', 'Admin'),
  
  -- Navigation - French
  ('nav.home', 'fr', 'Accueil'),
  ('nav.events', 'fr', 'Événements'),
  ('nav.categories', 'fr', 'Catégories'),
  ('nav.login', 'fr', 'Se connecter'),
  ('nav.register', 'fr', 'S''inscrire'),
  ('nav.dashboard', 'fr', 'Tableau de bord'),
  ('nav.profile', 'fr', 'Profil'),
  ('nav.support', 'fr', 'Support'),
  ('nav.logout', 'fr', 'Se déconnecter'),
  ('nav.admin', 'fr', 'Administration'),

  -- Common Actions - English
  ('action.save', 'en', 'Save'),
  ('action.cancel', 'en', 'Cancel'),
  ('action.edit', 'en', 'Edit'),
  ('action.delete', 'en', 'Delete'),
  ('action.confirm', 'en', 'Confirm'),
  ('action.back', 'en', 'Back'),
  ('action.next', 'en', 'Next'),
  ('action.search', 'en', 'Search'),
  ('action.filter', 'en', 'Filter'),
  ('action.clear', 'en', 'Clear'),
  ('action.view', 'en', 'View'),
  ('action.download', 'en', 'Download'),
  ('action.share', 'en', 'Share'),

  -- Common Actions - French
  ('action.save', 'fr', 'Enregistrer'),
  ('action.cancel', 'fr', 'Annuler'),
  ('action.edit', 'fr', 'Modifier'),
  ('action.delete', 'fr', 'Supprimer'),
  ('action.confirm', 'fr', 'Confirmer'),
  ('action.back', 'fr', 'Retour'),
  ('action.next', 'fr', 'Suivant'),
  ('action.search', 'fr', 'Rechercher'),
  ('action.filter', 'fr', 'Filtrer'),
  ('action.clear', 'fr', 'Effacer'),
  ('action.view', 'fr', 'Voir'),
  ('action.download', 'fr', 'Télécharger'),
  ('action.share', 'fr', 'Partager'),

  -- Messages - English
  ('message.loading', 'en', 'Loading...'),
  ('message.error', 'en', 'An error occurred'),
  ('message.success', 'en', 'Success!'),
  ('message.required', 'en', 'Required'),
  ('message.optional', 'en', 'Optional'),
  ('message.no_results', 'en', 'No results found'),
  ('message.try_again', 'en', 'Please try again'),

  -- Messages - French
  ('message.loading', 'fr', 'Chargement...'),
  ('message.error', 'fr', 'Une erreur est survenue'),
  ('message.success', 'fr', 'Succès !'),
  ('message.required', 'fr', 'Obligatoire'),
  ('message.optional', 'fr', 'Optionnel'),
  ('message.no_results', 'fr', 'Aucun résultat trouvé'),
  ('message.try_again', 'fr', 'Veuillez réessayer'),

  -- Errors - English
  ('error.network', 'en', 'Network error. Please check your connection.'),
  ('error.unauthorized', 'en', 'Please login to continue'),
  ('error.forbidden', 'en', 'You do not have permission to perform this action'),
  ('error.not_found', 'en', 'The requested resource was not found'),
  ('error.validation', 'en', 'Please check your input and try again'),
  ('error.server', 'en', 'Server error. Please try again later'),
  ('error.payment', 'en', 'Payment processing failed. Please try again'),
  ('error.tickets_unavailable', 'en', 'These tickets are no longer available'),

  -- Errors - French
  ('error.network', 'fr', 'Erreur réseau. Veuillez vérifier votre connexion.'),
  ('error.unauthorized', 'fr', 'Veuillez vous connecter pour continuer'),
  ('error.forbidden', 'fr', 'Vous n''avez pas la permission d''effectuer cette action'),
  ('error.not_found', 'fr', 'La ressource demandée n''a pas été trouvée'),
  ('error.validation', 'fr', 'Veuillez vérifier vos informations et réessayer'),
  ('error.server', 'fr', 'Erreur serveur. Veuillez réessayer plus tard'),
  ('error.payment', 'fr', 'Le traitement du paiement a échoué. Veuillez réessayer'),
  ('error.tickets_unavailable', 'fr', 'Ces billets ne sont plus disponibles'),

  -- Footer - English
  ('footer.about', 'en', 'About Us'),
  ('footer.terms', 'en', 'Terms of Service'),
  ('footer.privacy', 'en', 'Privacy Policy'),
  ('footer.contact', 'en', 'Contact Us'),
  ('footer.support', 'en', 'Support'),
  ('footer.newsletter', 'en', 'Subscribe to our newsletter'),
  ('footer.rights', 'en', 'All rights reserved'),

  -- Footer - French
  ('footer.about', 'fr', 'À Propos'),
  ('footer.terms', 'fr', 'Conditions d''Utilisation'),
  ('footer.privacy', 'fr', 'Politique de Confidentialité'),
  ('footer.contact', 'fr', 'Contactez-Nous'),
  ('footer.support', 'fr', 'Support'),
  ('footer.newsletter', 'fr', 'Abonnez-vous à notre newsletter'),
  ('footer.rights', 'fr', 'Tous droits réservés')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;