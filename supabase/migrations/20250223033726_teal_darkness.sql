-- Insert authentication translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('auth.login.title', 'en', 'Welcome back', 'auth'),
  ('auth.login.subtitle', 'en', 'Sign in to access your account', 'auth'),
  ('auth.login.email', 'en', 'Email address', 'auth'),
  ('auth.login.password', 'en', 'Password', 'auth'),
  ('auth.login.remember_me', 'en', 'Remember me', 'auth'),
  ('auth.login.forgot_password', 'en', 'Forgot password?', 'auth'),
  ('auth.login.submit', 'en', 'Sign in', 'auth'),
  ('auth.login.no_account', 'en', 'Don''t have an account?', 'auth'),
  ('auth.login.sign_up', 'en', 'Sign up', 'auth'),
  ('auth.login.signing_in', 'en', 'Signing in...', 'auth'),

  ('auth.register.title', 'en', 'Create your account', 'auth'),
  ('auth.register.subtitle', 'en', 'Join thousands of event enthusiasts', 'auth'),
  ('auth.register.name', 'en', 'Full Name', 'auth'),
  ('auth.register.email', 'en', 'Email address', 'auth'),
  ('auth.register.password', 'en', 'Password', 'auth'),
  ('auth.register.confirm_password', 'en', 'Confirm Password', 'auth'),
  ('auth.register.phone', 'en', 'Phone Number (optional)', 'auth'),
  ('auth.register.submit', 'en', 'Create Account', 'auth'),
  ('auth.register.has_account', 'en', 'Already have an account?', 'auth'),
  ('auth.register.sign_in', 'en', 'Sign in', 'auth'),
  ('auth.register.creating', 'en', 'Creating account...', 'auth'),

  -- French translations
  ('auth.login.title', 'fr', 'Bon retour', 'auth'),
  ('auth.login.subtitle', 'fr', 'Connectez-vous à votre compte', 'auth'),
  ('auth.login.email', 'fr', 'Adresse email', 'auth'),
  ('auth.login.password', 'fr', 'Mot de passe', 'auth'),
  ('auth.login.remember_me', 'fr', 'Se souvenir de moi', 'auth'),
  ('auth.login.forgot_password', 'fr', 'Mot de passe oublié ?', 'auth'),
  ('auth.login.submit', 'fr', 'Se connecter', 'auth'),
  ('auth.login.no_account', 'fr', 'Vous n''avez pas de compte ?', 'auth'),
  ('auth.login.sign_up', 'fr', 'S''inscrire', 'auth'),
  ('auth.login.signing_in', 'fr', 'Connexion en cours...', 'auth'),

  ('auth.register.title', 'fr', 'Créez votre compte', 'auth'),
  ('auth.register.subtitle', 'fr', 'Rejoignez des milliers de passionnés d''événements', 'auth'),
  ('auth.register.name', 'fr', 'Nom complet', 'auth'),
  ('auth.register.email', 'fr', 'Adresse email', 'auth'),
  ('auth.register.password', 'fr', 'Mot de passe', 'auth'),
  ('auth.register.confirm_password', 'fr', 'Confirmer le mot de passe', 'auth'),
  ('auth.register.phone', 'fr', 'Numéro de téléphone (optionnel)', 'auth'),
  ('auth.register.submit', 'fr', 'Créer un compte', 'auth'),
  ('auth.register.has_account', 'fr', 'Vous avez déjà un compte ?', 'auth'),
  ('auth.register.sign_in', 'fr', 'Se connecter', 'auth'),
  ('auth.register.creating', 'fr', 'Création du compte...', 'auth')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;