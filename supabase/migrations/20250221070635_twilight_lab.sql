-- Insert ticket transfer translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('transfers.title', 'en', 'Transfer Requests', 'transfers'),
  ('transfers.empty.title', 'en', 'No Transfer Requests', 'transfers'),
  ('transfers.empty.description', 'en', 'You have no pending ticket transfer requests', 'transfers'),
  ('transfers.from', 'en', 'From: {name} ({email})', 'transfers'),
  ('transfers.created', 'en', 'Created: {date}', 'transfers'),
  ('transfers.accept', 'en', 'Accept Transfer', 'transfers'),
  ('transfers.reject', 'en', 'Reject Transfer', 'transfers'),
  ('transfers.success.accept', 'en', 'Transfer accepted successfully', 'transfers'),
  ('transfers.success.reject', 'en', 'Transfer rejected successfully', 'transfers'),
  ('transfers.error.accept', 'en', 'Failed to accept transfer', 'transfers'),
  ('transfers.error.reject', 'en', 'Failed to reject transfer', 'transfers'),

  -- French translations
  ('transfers.title', 'fr', 'Demandes de Transfert', 'transfers'),
  ('transfers.empty.title', 'fr', 'Aucune Demande de Transfert', 'transfers'),
  ('transfers.empty.description', 'fr', 'Vous n''avez aucune demande de transfert de billet en attente', 'transfers'),
  ('transfers.from', 'fr', 'De : {name} ({email})', 'transfers'),
  ('transfers.created', 'fr', 'Créée le : {date}', 'transfers'),
  ('transfers.accept', 'fr', 'Accepter le Transfert', 'transfers'),
  ('transfers.reject', 'fr', 'Refuser le Transfert', 'transfers'),
  ('transfers.success.accept', 'fr', 'Transfert accepté avec succès', 'transfers'),
  ('transfers.success.reject', 'fr', 'Transfert refusé avec succès', 'transfers'),
  ('transfers.error.accept', 'fr', 'Échec de l''acceptation du transfert', 'transfers'),
  ('transfers.error.reject', 'fr', 'Échec du refus du transfert', 'transfers')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;