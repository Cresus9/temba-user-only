-- Insert missing authentication translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('auth.login.success', 'en', 'Successfully logged in!', 'auth'),
  ('auth.login.error', 'en', 'Invalid email or password', 'auth'),
  ('auth.register.success', 'en', 'Account created successfully!', 'auth'),
  ('auth.register.error', 'en', 'Failed to create account', 'auth'),
  ('auth.register.password_mismatch', 'en', 'Passwords do not match', 'auth'),
  ('auth.register.name_placeholder', 'en', 'John Doe', 'auth'),
  ('auth.register.phone_placeholder', 'en', '+226 XX XX XX XX', 'auth'),
  ('auth.register.password_requirements', 'en', 'Password must be at least 8 characters long', 'auth'),
  ('auth.register.terms', 'en', 'By creating an account, you agree to our Terms of Service and Privacy Policy', 'auth'),
  ('auth.register.join_text', 'en', 'Join Our Growing Community', 'auth'),
  ('auth.register.join_description', 'en', 'Create an account to discover and book amazing events across Africa. Get exclusive access to early bird tickets and special offers.', 'auth'),

  -- French translations
  ('auth.login.success', 'fr', 'Connexion réussie !', 'auth'),
  ('auth.login.error', 'fr', 'Email ou mot de passe invalide', 'auth'),
  ('auth.register.success', 'fr', 'Compte créé avec succès !', 'auth'),
  ('auth.register.error', 'fr', 'Échec de la création du compte', 'auth'),
  ('auth.register.password_mismatch', 'fr', 'Les mots de passe ne correspondent pas', 'auth'),
  ('auth.register.name_placeholder', 'fr', 'Jean Dupont', 'auth'),
  ('auth.register.phone_placeholder', 'fr', '+226 XX XX XX XX', 'auth'),
  ('auth.register.password_requirements', 'fr', 'Le mot de passe doit contenir au moins 8 caractères', 'auth'),
  ('auth.register.terms', 'fr', 'En créant un compte, vous acceptez nos Conditions d''utilisation et notre Politique de confidentialité', 'auth'),
  ('auth.register.join_text', 'fr', 'Rejoignez Notre Communauté Grandissante', 'auth'),
  ('auth.register.join_description', 'fr', 'Créez un compte pour découvrir et réserver des événements incroyables à travers l''Afrique. Obtenez un accès exclusif aux billets en prévente et aux offres spéciales.', 'auth'),

  -- Additional auth translations
  ('auth.validation.required', 'en', 'This field is required', 'auth'),
  ('auth.validation.email', 'en', 'Please enter a valid email address', 'auth'),
  ('auth.validation.phone', 'en', 'Please enter a valid phone number', 'auth'),
  ('auth.validation.password_length', 'en', 'Password must be at least 8 characters long', 'auth'),

  ('auth.validation.required', 'fr', 'Ce champ est obligatoire', 'auth'),
  ('auth.validation.email', 'fr', 'Veuillez entrer une adresse email valide', 'auth'),
  ('auth.validation.phone', 'fr', 'Veuillez entrer un numéro de téléphone valide', 'auth'),
  ('auth.validation.password_length', 'fr', 'Le mot de passe doit contenir au moins 8 caractères', 'auth')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;

-- Update existing translations if needed
UPDATE translations 
SET content = CASE 
  WHEN key = 'auth.register.title' AND locale = 'fr' THEN 'Créez votre compte'
  WHEN key = 'auth.register.subtitle' AND locale = 'fr' THEN 'Rejoignez des milliers de passionnés d''événements'
  WHEN key = 'auth.login.title' AND locale = 'fr' THEN 'Bon retour'
  WHEN key = 'auth.login.subtitle' AND locale = 'fr' THEN 'Connectez-vous à votre compte'
END
WHERE (key, locale) IN (
  ('auth.register.title', 'fr'),
  ('auth.register.subtitle', 'fr'),
  ('auth.login.title', 'fr'),
  ('auth.login.subtitle', 'fr')
);