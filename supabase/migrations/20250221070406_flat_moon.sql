-- Insert profile menu translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('profile.menu.profile_info', 'en', 'Profile Information', 'profile'),
  ('profile.menu.booking_history', 'en', 'Booking History', 'profile'),
  ('profile.menu.transfer_requests', 'en', 'Transfer Requests', 'profile'),
  ('profile.menu.notifications', 'en', 'Notifications', 'profile'),
  ('profile.menu.payment_methods', 'en', 'Payment Methods', 'profile'),
  ('profile.menu.account_settings', 'en', 'Account Settings', 'profile'),
  ('profile.menu.sign_out', 'en', 'Sign Out', 'profile'),
  ('profile.menu.member_since', 'en', 'Member since {year}', 'profile'),

  -- French translations
  ('profile.menu.profile_info', 'fr', 'Informations du Profil', 'profile'),
  ('profile.menu.booking_history', 'fr', 'Historique des Réservations', 'profile'),
  ('profile.menu.transfer_requests', 'fr', 'Demandes de Transfert', 'profile'),
  ('profile.menu.notifications', 'fr', 'Notifications', 'profile'),
  ('profile.menu.payment_methods', 'fr', 'Moyens de Paiement', 'profile'),
  ('profile.menu.account_settings', 'fr', 'Paramètres du Compte', 'profile'),
  ('profile.menu.sign_out', 'fr', 'Se Déconnecter', 'profile'),
  ('profile.menu.member_since', 'fr', 'Membre depuis {year}', 'profile')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;