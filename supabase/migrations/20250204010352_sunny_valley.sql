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
  -- Navigation - English
  ('nav.home', 'en', 'Home', 'navigation'),
  ('nav.events', 'en', 'Events', 'navigation'),
  ('nav.categories', 'en', 'Categories', 'navigation'),
  ('nav.login', 'en', 'Sign in', 'navigation'),
  ('nav.register', 'en', 'Sign up', 'navigation'),
  ('nav.dashboard', 'en', 'Dashboard', 'navigation'),
  ('nav.profile', 'en', 'Profile', 'navigation'),
  ('nav.support', 'en', 'Support', 'navigation'),
  ('nav.logout', 'en', 'Sign out', 'navigation'),
  ('nav.account', 'en', 'Account', 'navigation'),

  -- Navigation - French
  ('nav.home', 'fr', 'Accueil', 'navigation'),
  ('nav.events', 'fr', 'Événements', 'navigation'),
  ('nav.categories', 'fr', 'Catégories', 'navigation'),
  ('nav.login', 'fr', 'Se connecter', 'navigation'),
  ('nav.register', 'fr', 'S''inscrire', 'navigation'),
  ('nav.dashboard', 'fr', 'Tableau de bord', 'navigation'),
  ('nav.profile', 'fr', 'Profil', 'navigation'),
  ('nav.support', 'fr', 'Support', 'navigation'),
  ('nav.logout', 'fr', 'Se déconnecter', 'navigation'),
  ('nav.account', 'fr', 'Compte', 'navigation'),

  -- Common - English
  ('common.loading', 'en', 'Loading...', 'common'),
  ('common.error', 'en', 'An error occurred', 'common'),
  ('common.success', 'en', 'Success', 'common'),
  ('common.save', 'en', 'Save', 'common'),
  ('common.cancel', 'en', 'Cancel', 'common'),
  ('common.delete', 'en', 'Delete', 'common'),
  ('common.edit', 'en', 'Edit', 'common'),
  ('common.view', 'en', 'View', 'common'),
  ('common.back', 'en', 'Back', 'common'),
  ('common.next', 'en', 'Next', 'common'),
  ('common.previous', 'en', 'Previous', 'common'),
  ('common.search', 'en', 'Search', 'common'),
  ('common.filter', 'en', 'Filter', 'common'),
  ('common.sort', 'en', 'Sort', 'common'),
  ('common.required', 'en', 'Required', 'common'),
  ('common.optional', 'en', 'Optional', 'common'),

  -- Common - French
  ('common.loading', 'fr', 'Chargement...', 'common'),
  ('common.error', 'fr', 'Une erreur est survenue', 'common'),
  ('common.success', 'fr', 'Succès', 'common'),
  ('common.save', 'fr', 'Enregistrer', 'common'),
  ('common.cancel', 'fr', 'Annuler', 'common'),
  ('common.delete', 'fr', 'Supprimer', 'common'),
  ('common.edit', 'fr', 'Modifier', 'common'),
  ('common.view', 'fr', 'Voir', 'common'),
  ('common.back', 'fr', 'Retour', 'common'),
  ('common.next', 'fr', 'Suivant', 'common'),
  ('common.previous', 'fr', 'Précédent', 'common'),
  ('common.search', 'fr', 'Rechercher', 'common'),
  ('common.filter', 'fr', 'Filtrer', 'common'),
  ('common.sort', 'fr', 'Trier', 'common'),
  ('common.required', 'fr', 'Obligatoire', 'common'),
  ('common.optional', 'fr', 'Optionnel', 'common'),

  -- Auth - English
  ('auth.logout.success', 'en', 'Successfully logged out', 'auth'),
  ('auth.logout.error', 'en', 'Failed to logout', 'auth'),
  ('auth.login.success', 'en', 'Successfully logged in', 'auth'),
  ('auth.login.error', 'en', 'Invalid email or password', 'auth'),
  ('auth.register.success', 'en', 'Account created successfully', 'auth'),
  ('auth.register.error', 'en', 'Failed to create account', 'auth'),

  -- Auth - French
  ('auth.logout.success', 'fr', 'Déconnexion réussie', 'auth'),
  ('auth.logout.error', 'fr', 'Échec de la déconnexion', 'auth'),
  ('auth.login.success', 'fr', 'Connexion réussie', 'auth'),
  ('auth.login.error', 'fr', 'Email ou mot de passe invalide', 'auth'),
  ('auth.register.success', 'fr', 'Compte créé avec succès', 'auth'),
  ('auth.register.error', 'fr', 'Échec de la création du compte', 'auth'),

  -- Newsletter - English
  ('newsletter.subscribe', 'en', 'Subscribe', 'newsletter'),
  ('newsletter.subscribing', 'en', 'Subscribing...', 'newsletter'),
  ('newsletter.success', 'en', 'Thank you for subscribing!', 'newsletter'),
  ('newsletter.error.email_required', 'en', 'Please enter your email address', 'newsletter'),
  ('newsletter.error.generic', 'en', 'Failed to subscribe. Please try again.', 'newsletter'),
  ('newsletter.placeholder', 'en', 'Enter your email', 'newsletter'),

  -- Newsletter - French
  ('newsletter.subscribe', 'fr', 'S''abonner', 'newsletter'),
  ('newsletter.subscribing', 'fr', 'Abonnement en cours...', 'newsletter'),
  ('newsletter.success', 'fr', 'Merci de votre abonnement !', 'newsletter'),
  ('newsletter.error.email_required', 'fr', 'Veuillez saisir votre adresse email', 'newsletter'),
  ('newsletter.error.generic', 'fr', 'Échec de l''abonnement. Veuillez réessayer.', 'newsletter'),
  ('newsletter.placeholder', 'fr', 'Entrez votre email', 'newsletter')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;