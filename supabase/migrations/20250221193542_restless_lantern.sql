-- Insert fraud review translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.fraud.title', 'en', 'Fraud Review', 'admin'),
  ('admin.fraud.description', 'en', 'Review and manage flagged transactions', 'admin'),
  ('admin.fraud.no_transactions.title', 'en', 'No Flagged Transactions', 'admin'),
  ('admin.fraud.no_transactions.description', 'en', 'No transactions pending review', 'admin'),
  
  -- Table headers
  ('admin.fraud.table.order', 'en', 'Order Details', 'admin'),
  ('admin.fraud.table.risk_level', 'en', 'Risk Level', 'admin'),
  ('admin.fraud.table.reasons', 'en', 'Reasons', 'admin'),
  ('admin.fraud.table.ip_device', 'en', 'IP / Device', 'admin'),
  ('admin.fraud.table.status', 'en', 'Status', 'admin'),
  ('admin.fraud.table.actions', 'en', 'Actions', 'admin'),
  
  -- Risk levels
  ('admin.fraud.risk.high', 'en', 'High Risk', 'admin'),
  ('admin.fraud.risk.medium', 'en', 'Medium Risk', 'admin'),
  ('admin.fraud.risk.low', 'en', 'Low Risk', 'admin'),
  
  -- Status
  ('admin.fraud.status.pending', 'en', 'Pending Review', 'admin'),
  ('admin.fraud.status.reviewed', 'en', 'Reviewed', 'admin'),
  ('admin.fraud.status.reviewed_by', 'en', 'by {name}', 'admin'),
  ('admin.fraud.status.reviewed_at', 'en', 'on {date}', 'admin'),
  
  -- Actions
  ('admin.fraud.actions.approve', 'en', 'Approve Transaction', 'admin'),
  ('admin.fraud.actions.reject', 'en', 'Reject Transaction', 'admin'),
  ('admin.fraud.actions.view_details', 'en', 'View Details', 'admin'),
  
  -- Success messages
  ('admin.fraud.success.approve', 'en', 'Transaction approved successfully', 'admin'),
  ('admin.fraud.success.reject', 'en', 'Transaction rejected successfully', 'admin'),
  
  -- Error messages
  ('admin.fraud.error.load', 'en', 'Failed to load flagged transactions', 'admin'),
  ('admin.fraud.error.approve', 'en', 'Failed to approve transaction', 'admin'),
  ('admin.fraud.error.reject', 'en', 'Failed to reject transaction', 'admin'),

  -- French translations
  ('admin.fraud.title', 'fr', 'Revue des Fraudes', 'admin'),
  ('admin.fraud.description', 'fr', 'Examiner et gérer les transactions signalées', 'admin'),
  ('admin.fraud.no_transactions.title', 'fr', 'Aucune Transaction Signalée', 'admin'),
  ('admin.fraud.no_transactions.description', 'fr', 'Aucune transaction en attente de revue', 'admin'),
  
  -- Table headers
  ('admin.fraud.table.order', 'fr', 'Détails de la Commande', 'admin'),
  ('admin.fraud.table.risk_level', 'fr', 'Niveau de Risque', 'admin'),
  ('admin.fraud.table.reasons', 'fr', 'Raisons', 'admin'),
  ('admin.fraud.table.ip_device', 'fr', 'IP / Appareil', 'admin'),
  ('admin.fraud.table.status', 'fr', 'Statut', 'admin'),
  ('admin.fraud.table.actions', 'fr', 'Actions', 'admin'),
  
  -- Risk levels
  ('admin.fraud.risk.high', 'fr', 'Risque Élevé', 'admin'),
  ('admin.fraud.risk.medium', 'fr', 'Risque Moyen', 'admin'),
  ('admin.fraud.risk.low', 'fr', 'Risque Faible', 'admin'),
  
  -- Status
  ('admin.fraud.status.pending', 'fr', 'En Attente de Revue', 'admin'),
  ('admin.fraud.status.reviewed', 'fr', 'Examiné', 'admin'),
  ('admin.fraud.status.reviewed_by', 'fr', 'par {name}', 'admin'),
  ('admin.fraud.status.reviewed_at', 'fr', 'le {date}', 'admin'),
  
  -- Actions
  ('admin.fraud.actions.approve', 'fr', 'Approuver la Transaction', 'admin'),
  ('admin.fraud.actions.reject', 'fr', 'Rejeter la Transaction', 'admin'),
  ('admin.fraud.actions.view_details', 'fr', 'Voir les Détails', 'admin'),
  
  -- Success messages
  ('admin.fraud.success.approve', 'fr', 'Transaction approuvée avec succès', 'admin'),
  ('admin.fraud.success.reject', 'fr', 'Transaction rejetée avec succès', 'admin'),
  
  -- Error messages
  ('admin.fraud.error.load', 'fr', 'Échec du chargement des transactions signalées', 'admin'),
  ('admin.fraud.error.approve', 'fr', 'Échec de l''approbation de la transaction', 'admin'),
  ('admin.fraud.error.reject', 'fr', 'Échec du rejet de la transaction', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;