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

-- Insert common translations
INSERT INTO translations (key, locale, content) VALUES
  -- English translations
  ('nav.events', 'en', 'Events'),
  ('nav.categories', 'en', 'Categories'),
  ('nav.login', 'en', 'Sign in'),
  ('nav.register', 'en', 'Sign up'),
  ('nav.dashboard', 'en', 'Dashboard'),
  ('nav.profile', 'en', 'Profile'),
  ('nav.support', 'en', 'Support'),
  ('nav.logout', 'en', 'Sign out'),
  
  -- French translations  
  ('nav.events', 'fr', 'Événements'),
  ('nav.categories', 'fr', 'Catégories'),
  ('nav.login', 'fr', 'Se connecter'),
  ('nav.register', 'fr', 'S''inscrire'),
  ('nav.dashboard', 'fr', 'Tableau de bord'),
  ('nav.profile', 'fr', 'Profil'),
  ('nav.support', 'fr', 'Support'),
  ('nav.logout', 'fr', 'Se déconnecter'),

  -- Common English translations
  ('common.loading', 'en', 'Loading...'),
  ('common.error', 'en', 'An error occurred'),
  ('common.success', 'en', 'Success'),
  ('common.save', 'en', 'Save'),
  ('common.cancel', 'en', 'Cancel'),
  ('common.delete', 'en', 'Delete'),
  ('common.edit', 'en', 'Edit'),
  ('common.view', 'en', 'View'),
  ('common.back', 'en', 'Back'),
  ('common.next', 'en', 'Next'),
  ('common.previous', 'en', 'Previous'),
  ('common.search', 'en', 'Search'),
  ('common.filter', 'en', 'Filter'),
  ('common.sort', 'en', 'Sort'),
  ('common.required', 'en', 'Required'),
  ('common.optional', 'en', 'Optional'),
  
  -- Common French translations
  ('common.loading', 'fr', 'Chargement...'),
  ('common.error', 'fr', 'Une erreur est survenue'),
  ('common.success', 'fr', 'Succès'),
  ('common.save', 'fr', 'Enregistrer'),
  ('common.cancel', 'fr', 'Annuler'),
  ('common.delete', 'fr', 'Supprimer'),
  ('common.edit', 'fr', 'Modifier'),
  ('common.view', 'fr', 'Voir'),
  ('common.back', 'fr', 'Retour'),
  ('common.next', 'fr', 'Suivant'),
  ('common.previous', 'fr', 'Précédent'),
  ('common.search', 'fr', 'Rechercher'),
  ('common.filter', 'fr', 'Filtrer'),
  ('common.sort', 'fr', 'Trier'),
  ('common.required', 'fr', 'Obligatoire'),
  ('common.optional', 'fr', 'Optionnel'),

  -- Error messages English
  ('error.network', 'en', 'Network error. Please check your connection.'),
  ('error.unauthorized', 'en', 'Please login to continue'),
  ('error.forbidden', 'en', 'You do not have permission to perform this action'),
  ('error.not_found', 'en', 'The requested resource was not found'),
  ('error.validation', 'en', 'Please check your input and try again'),
  ('error.server', 'en', 'Server error. Please try again later'),
  ('error.payment', 'en', 'Payment processing failed. Please try again'),
  ('error.tickets_unavailable', 'en', 'These tickets are no longer available'),
  
  -- Error messages French
  ('error.network', 'fr', 'Erreur réseau. Veuillez vérifier votre connexion.'),
  ('error.unauthorized', 'fr', 'Veuillez vous connecter pour continuer'),
  ('error.forbidden', 'fr', 'Vous n''avez pas la permission d''effectuer cette action'),
  ('error.not_found', 'fr', 'La ressource demandée n''a pas été trouvée'),
  ('error.validation', 'fr', 'Veuillez vérifier vos informations et réessayer'),
  ('error.server', 'fr', 'Erreur serveur. Veuillez réessayer plus tard'),
  ('error.payment', 'fr', 'Le traitement du paiement a échoué. Veuillez réessayer'),
  ('error.tickets_unavailable', 'fr', 'Ces billets ne sont plus disponibles')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;