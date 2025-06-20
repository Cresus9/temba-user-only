-- Insert order management translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.orders.title', 'en', 'Order Management', 'admin'),
  ('admin.orders.search', 'en', 'Search orders...', 'admin'),
  ('admin.orders.export', 'en', 'Export Orders', 'admin'),
  
  -- Stats
  ('admin.orders.stats.total_orders', 'en', 'Total Orders', 'admin'),
  ('admin.orders.stats.completed_orders', 'en', 'Completed Orders', 'admin'),
  ('admin.orders.stats.total_revenue', 'en', 'Total Revenue', 'admin'),
  ('admin.orders.stats.recent_orders', 'en', 'Recent Orders', 'admin'),
  ('admin.orders.stats.last_30_days', 'en', 'Last 30 days', 'admin'),

  -- Table headers
  ('admin.orders.table.order_id', 'en', 'Order ID', 'admin'),
  ('admin.orders.table.customer', 'en', 'Customer', 'admin'),
  ('admin.orders.table.event', 'en', 'Event', 'admin'),
  ('admin.orders.table.date', 'en', 'Date', 'admin'),
  ('admin.orders.table.amount', 'en', 'Amount', 'admin'),
  ('admin.orders.table.status', 'en', 'Status', 'admin'),
  ('admin.orders.table.actions', 'en', 'Actions', 'admin'),

  -- Status
  ('admin.orders.status.pending', 'en', 'Pending', 'admin'),
  ('admin.orders.status.completed', 'en', 'Completed', 'admin'),
  ('admin.orders.status.cancelled', 'en', 'Cancelled', 'admin'),

  -- Actions
  ('admin.orders.actions.view', 'en', 'View Details', 'admin'),
  ('admin.orders.actions.refund', 'en', 'Refund Order', 'admin'),
  ('admin.orders.actions.cancel', 'en', 'Cancel Order', 'admin'),

  -- Success messages
  ('admin.orders.success.status_update', 'en', 'Order status updated successfully', 'admin'),
  ('admin.orders.success.refund', 'en', 'Order refunded successfully', 'admin'),

  -- Error messages
  ('admin.orders.error.status_update', 'en', 'Failed to update order status', 'admin'),
  ('admin.orders.error.refund', 'en', 'Failed to refund order', 'admin'),
  ('admin.orders.error.load', 'en', 'Failed to load orders', 'admin'),

  -- Confirmation messages
  ('admin.orders.confirm.refund', 'en', 'Are you sure you want to refund this order?', 'admin'),
  ('admin.orders.confirm.cancel', 'en', 'Are you sure you want to cancel this order?', 'admin'),

  -- French translations
  ('admin.orders.title', 'fr', 'Gestion des Commandes', 'admin'),
  ('admin.orders.search', 'fr', 'Rechercher des commandes...', 'admin'),
  ('admin.orders.export', 'fr', 'Exporter les Commandes', 'admin'),
  
  -- Stats
  ('admin.orders.stats.total_orders', 'fr', 'Total des Commandes', 'admin'),
  ('admin.orders.stats.completed_orders', 'fr', 'Commandes Terminées', 'admin'),
  ('admin.orders.stats.total_revenue', 'fr', 'Revenu Total', 'admin'),
  ('admin.orders.stats.recent_orders', 'fr', 'Commandes Récentes', 'admin'),
  ('admin.orders.stats.last_30_days', 'fr', 'Derniers 30 jours', 'admin'),

  -- Table headers
  ('admin.orders.table.order_id', 'fr', 'ID Commande', 'admin'),
  ('admin.orders.table.customer', 'fr', 'Client', 'admin'),
  ('admin.orders.table.event', 'fr', 'Événement', 'admin'),
  ('admin.orders.table.date', 'fr', 'Date', 'admin'),
  ('admin.orders.table.amount', 'fr', 'Montant', 'admin'),
  ('admin.orders.table.status', 'fr', 'Statut', 'admin'),
  ('admin.orders.table.actions', 'fr', 'Actions', 'admin'),

  -- Status
  ('admin.orders.status.pending', 'fr', 'En Attente', 'admin'),
  ('admin.orders.status.completed', 'fr', 'Terminée', 'admin'),
  ('admin.orders.status.cancelled', 'fr', 'Annulée', 'admin'),

  -- Actions
  ('admin.orders.actions.view', 'fr', 'Voir les Détails', 'admin'),
  ('admin.orders.actions.refund', 'fr', 'Rembourser la Commande', 'admin'),
  ('admin.orders.actions.cancel', 'fr', 'Annuler la Commande', 'admin'),

  -- Success messages
  ('admin.orders.success.status_update', 'fr', 'Statut de la commande mis à jour avec succès', 'admin'),
  ('admin.orders.success.refund', 'fr', 'Commande remboursée avec succès', 'admin'),

  -- Error messages
  ('admin.orders.error.status_update', 'fr', 'Échec de la mise à jour du statut de la commande', 'admin'),
  ('admin.orders.error.refund', 'fr', 'Échec du remboursement de la commande', 'admin'),
  ('admin.orders.error.load', 'fr', 'Échec du chargement des commandes', 'admin'),

  -- Confirmation messages
  ('admin.orders.confirm.refund', 'fr', 'Êtes-vous sûr de vouloir rembourser cette commande ?', 'admin'),
  ('admin.orders.confirm.cancel', 'fr', 'Êtes-vous sûr de vouloir annuler cette commande ?', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;