-- Insert profile information translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('profile.info.title', 'en', 'Profile Information', 'profile'),
  ('profile.info.edit', 'en', 'Edit Profile', 'profile'),
  ('profile.info.cancel', 'en', 'Cancel', 'profile'),
  ('profile.info.save', 'en', 'Save Changes', 'profile'),
  ('profile.info.saving', 'en', 'Saving...', 'profile'),
  
  ('profile.fields.name', 'en', 'Full Name', 'profile'),
  ('profile.fields.email', 'en', 'Email Address', 'profile'),
  ('profile.fields.phone', 'en', 'Phone Number', 'profile'),
  ('profile.fields.phone.placeholder', 'en', '+233 XX XXX XXXX', 'profile'),
  ('profile.fields.location', 'en', 'Location', 'profile'),
  ('profile.fields.location.placeholder', 'en', 'City, Country', 'profile'),
  ('profile.fields.bio', 'en', 'Bio', 'profile'),
  ('profile.fields.bio.placeholder', 'en', 'Tell us about yourself...', 'profile'),

  ('profile.success.update', 'en', 'Profile updated successfully', 'profile'),
  ('profile.error.update', 'en', 'Failed to update profile', 'profile'),
  ('profile.error.load', 'en', 'Failed to load profile', 'profile'),
  ('profile.error.try_again', 'en', 'Profile not found. Please try refreshing the page.', 'profile'),

  -- French translations
  ('profile.info.title', 'fr', 'Informations du Profil', 'profile'),
  ('profile.info.edit', 'fr', 'Modifier le Profil', 'profile'),
  ('profile.info.cancel', 'fr', 'Annuler', 'profile'),
  ('profile.info.save', 'fr', 'Enregistrer les Modifications', 'profile'),
  ('profile.info.saving', 'fr', 'Enregistrement...', 'profile'),
  
  ('profile.fields.name', 'fr', 'Nom Complet', 'profile'),
  ('profile.fields.email', 'fr', 'Adresse Email', 'profile'),
  ('profile.fields.phone', 'fr', 'Numéro de Téléphone', 'profile'),
  ('profile.fields.phone.placeholder', 'fr', '+226 XX XX XX XX', 'profile'),
  ('profile.fields.location', 'fr', 'Localisation', 'profile'),
  ('profile.fields.location.placeholder', 'fr', 'Ville, Pays', 'profile'),
  ('profile.fields.bio', 'fr', 'Bio', 'profile'),
  ('profile.fields.bio.placeholder', 'fr', 'Parlez-nous de vous...', 'profile'),

  ('profile.success.update', 'fr', 'Profil mis à jour avec succès', 'profile'),
  ('profile.error.update', 'fr', 'Échec de la mise à jour du profil', 'profile'),
  ('profile.error.load', 'fr', 'Échec du chargement du profil', 'profile'),
  ('profile.error.try_again', 'fr', 'Profil non trouvé. Veuillez rafraîchir la page.', 'profile')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;