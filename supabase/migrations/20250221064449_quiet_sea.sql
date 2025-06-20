-- Insert support page translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('support.title', 'en', 'Support', 'support'),
  ('support.description', 'en', 'View and manage your support tickets', 'support'),
  ('support.new_ticket', 'en', 'New Ticket', 'support'),
  ('support.back_to_dashboard', 'en', 'Back to Dashboard', 'support'),
  ('support.no_tickets.title', 'en', 'No Support Tickets', 'support'),
  ('support.no_tickets.description', 'en', 'You haven''t created any support tickets yet', 'support'),
  ('support.create_first_ticket', 'en', 'Create Your First Ticket', 'support'),

  -- French translations
  ('support.title', 'fr', 'Support', 'support'),
  ('support.description', 'fr', 'Consultez et gérez vos tickets de support', 'support'),
  ('support.new_ticket', 'fr', 'Nouveau Ticket', 'support'),
  ('support.back_to_dashboard', 'fr', 'Retour au Tableau de Bord', 'support'),
  ('support.no_tickets.title', 'fr', 'Aucun Ticket de Support', 'support'),
  ('support.no_tickets.description', 'fr', 'Vous n''avez pas encore créé de ticket de support', 'support'),
  ('support.create_first_ticket', 'fr', 'Créer Votre Premier Ticket', 'support')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;