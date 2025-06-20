-- Insert missing authentication translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('auth.register.title', 'en', 'Create your account', 'auth'),
  ('auth.register.subtitle', 'en', 'Join thousands of event enthusiasts', 'auth'),
  ('auth.register.name', 'en', 'Full Name', 'auth'),
  ('auth.register.name_placeholder', 'en', 'John Doe', 'auth'),
  ('auth.register.email', 'en', 'Email address', 'auth'),
  ('auth.register.phone', 'en', 'Phone Number (optional)', 'auth'),
  ('auth.register.phone_placeholder', 'en', '+226 XX XX XX XX', 'auth'),
  ('auth.register.password', 'en', 'Password', 'auth'),
  ('auth.register.confirm_password', 'en', 'Confirm Password', 'auth'),
  ('auth.register.submit', 'en', 'Create Account', 'auth'),
  ('auth.register.creating', 'en', 'Creating account...', 'auth'),
  ('auth.register.has_account', 'en', 'Already have an account?', 'auth'),
  ('auth.register.sign_in', 'en', 'Sign in', 'auth'),
  ('auth.register.join_text', 'en', 'Join Our Growing Community', 'auth'),
  ('auth.register.join_description', 'en', 'Create an account to discover and book amazing events across Africa. Get exclusive access to early bird tickets and special offers.', 'auth'),

  -- French translations
  ('auth.register.title', 'fr', 'Créez votre compte', 'auth'),
  ('auth.register.subtitle', 'fr', 'Rejoignez des milliers de passionnés d''événements', 'auth'),
  ('auth.register.name', 'fr', 'Nom complet', 'auth'),
  ('auth.register.name_placeholder', 'fr', 'Jean Dupont', 'auth'),
  ('auth.register.email', 'fr', 'Adresse email', 'auth'),
  ('auth.register.phone', 'fr', 'Numéro de téléphone (optionnel)', 'auth'),
  ('auth.register.phone_placeholder', 'fr', '+226 XX XX XX XX', 'auth'),
  ('auth.register.password', 'fr', 'Mot de passe', 'auth'),
  ('auth.register.confirm_password', 'fr', 'Confirmer le mot de passe', 'auth'),
  ('auth.register.submit', 'fr', 'Créer un compte', 'auth'),
  ('auth.register.creating', 'fr', 'Création du compte...', 'auth'),
  ('auth.register.has_account', 'fr', 'Vous avez déjà un compte ?', 'auth'),
  ('auth.register.sign_in', 'fr', 'Se connecter', 'auth'),
  ('auth.register.join_text', 'fr', 'Rejoignez Notre Communauté Grandissante', 'auth'),
  ('auth.register.join_description', 'fr', 'Créez un compte pour découvrir et réserver des événements incroyables à travers l''Afrique. Obtenez un accès exclusif aux billets en prévente et aux offres spéciales.', 'auth')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;