-- Insert user management translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.users.title', 'en', 'User Management', 'admin'),
  ('admin.users.search', 'en', 'Search users...', 'admin'),
  ('admin.users.filters.all_roles', 'en', 'All Roles', 'admin'),
  ('admin.users.filters.all_status', 'en', 'All Status', 'admin'),
  ('admin.users.filters.clear', 'en', 'Clear Filters', 'admin'),

  -- Table headers
  ('admin.users.table.user', 'en', 'User', 'admin'),
  ('admin.users.table.contact', 'en', 'Contact', 'admin'),
  ('admin.users.table.role', 'en', 'Role', 'admin'),
  ('admin.users.table.status', 'en', 'Status', 'admin'),
  ('admin.users.table.actions', 'en', 'Actions', 'admin'),

  -- Roles
  ('admin.users.roles.user', 'en', 'User', 'admin'),
  ('admin.users.roles.admin', 'en', 'Admin', 'admin'),

  -- Status
  ('admin.users.status.active', 'en', 'Active', 'admin'),
  ('admin.users.status.suspended', 'en', 'Suspended', 'admin'),
  ('admin.users.status.banned', 'en', 'Banned', 'admin'),

  -- Actions
  ('admin.users.actions.send_message', 'en', 'Send Message', 'admin'),
  ('admin.users.actions.delete', 'en', 'Delete User', 'admin'),
  ('admin.users.actions.more', 'en', 'More Actions', 'admin'),

  -- Success messages
  ('admin.users.success.role_update', 'en', 'User role updated successfully', 'admin'),
  ('admin.users.success.status_update', 'en', 'User status updated successfully', 'admin'),
  ('admin.users.success.delete', 'en', 'User deleted successfully', 'admin'),
  ('admin.users.success.message_sent', 'en', 'Message sent successfully', 'admin'),

  -- Error messages
  ('admin.users.error.role_update', 'en', 'Failed to update user role', 'admin'),
  ('admin.users.error.status_update', 'en', 'Failed to update user status', 'admin'),
  ('admin.users.error.delete', 'en', 'Failed to delete user', 'admin'),
  ('admin.users.error.message_send', 'en', 'Failed to send message', 'admin'),
  ('admin.users.error.load', 'en', 'Failed to load users', 'admin'),

  -- Confirmation messages
  ('admin.users.confirm.delete', 'en', 'Are you sure you want to delete this user? This action cannot be undone.', 'admin'),
  ('admin.users.confirm.suspend', 'en', 'Are you sure you want to suspend this user?', 'admin'),
  ('admin.users.confirm.ban', 'en', 'Are you sure you want to ban this user?', 'admin'),

  -- French translations
  ('admin.users.title', 'fr', 'Gestion des Utilisateurs', 'admin'),
  ('admin.users.search', 'fr', 'Rechercher des utilisateurs...', 'admin'),
  ('admin.users.filters.all_roles', 'fr', 'Tous les Rôles', 'admin'),
  ('admin.users.filters.all_status', 'fr', 'Tous les Statuts', 'admin'),
  ('admin.users.filters.clear', 'fr', 'Effacer les Filtres', 'admin'),

  -- Table headers
  ('admin.users.table.user', 'fr', 'Utilisateur', 'admin'),
  ('admin.users.table.contact', 'fr', 'Contact', 'admin'),
  ('admin.users.table.role', 'fr', 'Rôle', 'admin'),
  ('admin.users.table.status', 'fr', 'Statut', 'admin'),
  ('admin.users.table.actions', 'fr', 'Actions', 'admin'),

  -- Roles
  ('admin.users.roles.user', 'fr', 'Utilisateur', 'admin'),
  ('admin.users.roles.admin', 'fr', 'Administrateur', 'admin'),

  -- Status
  ('admin.users.status.active', 'fr', 'Actif', 'admin'),
  ('admin.users.status.suspended', 'fr', 'Suspendu', 'admin'),
  ('admin.users.status.banned', 'fr', 'Banni', 'admin'),

  -- Actions
  ('admin.users.actions.send_message', 'fr', 'Envoyer un Message', 'admin'),
  ('admin.users.actions.delete', 'fr', 'Supprimer l''Utilisateur', 'admin'),
  ('admin.users.actions.more', 'fr', 'Plus d''Actions', 'admin'),

  -- Success messages
  ('admin.users.success.role_update', 'fr', 'Rôle de l''utilisateur mis à jour avec succès', 'admin'),
  ('admin.users.success.status_update', 'fr', 'Statut de l''utilisateur mis à jour avec succès', 'admin'),
  ('admin.users.success.delete', 'fr', 'Utilisateur supprimé avec succès', 'admin'),
  ('admin.users.success.message_sent', 'fr', 'Message envoyé avec succès', 'admin'),

  -- Error messages
  ('admin.users.error.role_update', 'fr', 'Échec de la mise à jour du rôle de l''utilisateur', 'admin'),
  ('admin.users.error.status_update', 'fr', 'Échec de la mise à jour du statut de l''utilisateur', 'admin'),
  ('admin.users.error.delete', 'fr', 'Échec de la suppression de l''utilisateur', 'admin'),
  ('admin.users.error.message_send', 'fr', 'Échec de l''envoi du message', 'admin'),
  ('admin.users.error.load', 'fr', 'Échec du chargement des utilisateurs', 'admin'),

  -- Confirmation messages
  ('admin.users.confirm.delete', 'fr', 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.', 'admin'),
  ('admin.users.confirm.suspend', 'fr', 'Êtes-vous sûr de vouloir suspendre cet utilisateur ?', 'admin'),
  ('admin.users.confirm.ban', 'fr', 'Êtes-vous sûr de vouloir bannir cet utilisateur ?', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;