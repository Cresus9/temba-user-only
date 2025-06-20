-- Insert support management translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.support.title', 'en', 'Support Management', 'admin'),
  ('admin.support.search', 'en', 'Search tickets...', 'admin'),
  
  -- Table headers
  ('admin.support.table.ticket', 'en', 'Ticket', 'admin'),
  ('admin.support.table.user', 'en', 'User', 'admin'),
  ('admin.support.table.status', 'en', 'Status', 'admin'),
  ('admin.support.table.priority', 'en', 'Priority', 'admin'),
  ('admin.support.table.category', 'en', 'Category', 'admin'),
  ('admin.support.table.messages', 'en', 'Messages', 'admin'),
  ('admin.support.table.last_activity', 'en', 'Last Activity', 'admin'),
  ('admin.support.table.actions', 'en', 'Actions', 'admin'),

  -- Status
  ('admin.support.status.open', 'en', 'Open', 'admin'),
  ('admin.support.status.in_progress', 'en', 'In Progress', 'admin'),
  ('admin.support.status.resolved', 'en', 'Resolved', 'admin'),
  ('admin.support.status.closed', 'en', 'Closed', 'admin'),

  -- Priority
  ('admin.support.priority.low', 'en', 'Low', 'admin'),
  ('admin.support.priority.medium', 'en', 'Medium', 'admin'),
  ('admin.support.priority.high', 'en', 'High', 'admin'),
  ('admin.support.priority.urgent', 'en', 'Urgent', 'admin'),

  -- Categories
  ('admin.support.categories.general', 'en', 'General', 'admin'),
  ('admin.support.categories.technical', 'en', 'Technical', 'admin'),
  ('admin.support.categories.billing', 'en', 'Billing', 'admin'),
  ('admin.support.categories.account', 'en', 'Account', 'admin'),

  -- Filters
  ('admin.support.filters.all_status', 'en', 'All Status', 'admin'),
  ('admin.support.filters.all_priority', 'en', 'All Priority', 'admin'),
  ('admin.support.filters.all_categories', 'en', 'All Categories', 'admin'),

  -- Actions
  ('admin.support.actions.view', 'en', 'View', 'admin'),
  ('admin.support.actions.reply', 'en', 'Reply', 'admin'),
  ('admin.support.actions.close', 'en', 'Close', 'admin'),

  -- Messages
  ('admin.support.created', 'en', 'Created: {date}', 'admin'),
  ('admin.support.error.load', 'en', 'Failed to load support tickets', 'admin'),

  -- French translations
  ('admin.support.title', 'fr', 'Gestion du Support', 'admin'),
  ('admin.support.search', 'fr', 'Rechercher des tickets...', 'admin'),
  
  -- Table headers
  ('admin.support.table.ticket', 'fr', 'Ticket', 'admin'),
  ('admin.support.table.user', 'fr', 'Utilisateur', 'admin'),
  ('admin.support.table.status', 'fr', 'Statut', 'admin'),
  ('admin.support.table.priority', 'fr', 'Priorité', 'admin'),
  ('admin.support.table.category', 'fr', 'Catégorie', 'admin'),
  ('admin.support.table.messages', 'fr', 'Messages', 'admin'),
  ('admin.support.table.last_activity', 'fr', 'Dernière Activité', 'admin'),
  ('admin.support.table.actions', 'fr', 'Actions', 'admin'),

  -- Status
  ('admin.support.status.open', 'fr', 'Ouvert', 'admin'),
  ('admin.support.status.in_progress', 'fr', 'En Cours', 'admin'),
  ('admin.support.status.resolved', 'fr', 'Résolu', 'admin'),
  ('admin.support.status.closed', 'fr', 'Fermé', 'admin'),

  -- Priority
  ('admin.support.priority.low', 'fr', 'Faible', 'admin'),
  ('admin.support.priority.medium', 'fr', 'Moyenne', 'admin'),
  ('admin.support.priority.high', 'fr', 'Élevée', 'admin'),
  ('admin.support.priority.urgent', 'fr', 'Urgente', 'admin'),

  -- Categories
  ('admin.support.categories.general', 'fr', 'Général', 'admin'),
  ('admin.support.categories.technical', 'fr', 'Technique', 'admin'),
  ('admin.support.categories.billing', 'fr', 'Facturation', 'admin'),
  ('admin.support.categories.account', 'fr', 'Compte', 'admin'),

  -- Filters
  ('admin.support.filters.all_status', 'fr', 'Tous les Statuts', 'admin'),
  ('admin.support.filters.all_priority', 'fr', 'Toutes les Priorités', 'admin'),
  ('admin.support.filters.all_categories', 'fr', 'Toutes les Catégories', 'admin'),

  -- Actions
  ('admin.support.actions.view', 'fr', 'Voir', 'admin'),
  ('admin.support.actions.reply', 'fr', 'Répondre', 'admin'),
  ('admin.support.actions.close', 'fr', 'Fermer', 'admin'),

  -- Messages
  ('admin.support.created', 'fr', 'Créé le : {date}', 'admin'),
  ('admin.support.error.load', 'fr', 'Échec du chargement des tickets de support', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;