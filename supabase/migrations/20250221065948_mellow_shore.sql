-- Insert account settings translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('account.settings.title', 'en', 'Account Settings', 'account'),
  ('account.password.title', 'en', 'Change Password', 'account'),
  ('account.password.current', 'en', 'Current Password', 'account'),
  ('account.password.new', 'en', 'New Password', 'account'),
  ('account.password.confirm', 'en', 'Confirm New Password', 'account'),
  ('account.password.update', 'en', 'Update Password', 'account'),
  ('account.password.updating', 'en', 'Updating...', 'account'),
  
  ('account.security.title', 'en', 'Security Settings', 'account'),
  ('account.security.2fa.title', 'en', 'Two-Factor Authentication', 'account'),
  ('account.security.2fa.description', 'en', 'Add an extra layer of security to your account', 'account'),
  ('account.security.2fa.enable', 'en', 'Enable', 'account'),
  ('account.security.login_history.title', 'en', 'Login History', 'account'),
  ('account.security.login_history.description', 'en', 'View your recent login activity', 'account'),
  ('account.security.login_history.view', 'en', 'View History', 'account'),
  ('account.security.login_history.hide', 'en', 'Hide History', 'account'),
  
  ('account.delete.title', 'en', 'Delete Account', 'account'),
  ('account.delete.warning', 'en', 'Once you delete your account, there is no going back. Please be certain.', 'account'),
  ('account.delete.confirm_text', 'en', 'Please type "delete my account" to confirm deletion', 'account'),
  ('account.delete.button', 'en', 'Delete Account', 'account'),
  ('account.delete.deleting', 'en', 'Deleting...', 'account'),
  ('account.delete.confirm_button', 'en', 'Confirm Delete', 'account'),
  ('account.delete.cancel', 'en', 'Cancel', 'account'),

  -- French translations
  ('account.settings.title', 'fr', 'Paramètres du Compte', 'account'),
  ('account.password.title', 'fr', 'Changer le Mot de Passe', 'account'),
  ('account.password.current', 'fr', 'Mot de Passe Actuel', 'account'),
  ('account.password.new', 'fr', 'Nouveau Mot de Passe', 'account'),
  ('account.password.confirm', 'fr', 'Confirmer le Nouveau Mot de Passe', 'account'),
  ('account.password.update', 'fr', 'Mettre à Jour le Mot de Passe', 'account'),
  ('account.password.updating', 'fr', 'Mise à Jour...', 'account'),
  
  ('account.security.title', 'fr', 'Paramètres de Sécurité', 'account'),
  ('account.security.2fa.title', 'fr', 'Authentification à Deux Facteurs', 'account'),
  ('account.security.2fa.description', 'fr', 'Ajoutez une couche de sécurité supplémentaire à votre compte', 'account'),
  ('account.security.2fa.enable', 'fr', 'Activer', 'account'),
  ('account.security.login_history.title', 'fr', 'Historique des Connexions', 'account'),
  ('account.security.login_history.description', 'fr', 'Consultez votre activité de connexion récente', 'account'),
  ('account.security.login_history.view', 'fr', 'Voir l''Historique', 'account'),
  ('account.security.login_history.hide', 'fr', 'Masquer l''Historique', 'account'),
  
  ('account.delete.title', 'fr', 'Supprimer le Compte', 'account'),
  ('account.delete.warning', 'fr', 'Une fois que vous supprimez votre compte, il n''y a pas de retour en arrière. Veuillez être certain.', 'account'),
  ('account.delete.confirm_text', 'fr', 'Veuillez taper "supprimer mon compte" pour confirmer la suppression', 'account'),
  ('account.delete.button', 'fr', 'Supprimer le Compte', 'account'),
  ('account.delete.deleting', 'fr', 'Suppression...', 'account'),
  ('account.delete.confirm_button', 'fr', 'Confirmer la Suppression', 'account'),
  ('account.delete.cancel', 'fr', 'Annuler', 'account')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;