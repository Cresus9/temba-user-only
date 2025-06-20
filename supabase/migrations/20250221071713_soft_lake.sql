-- Insert event management translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('admin.events.title', 'en', 'Event Management', 'admin'),
  ('admin.events.create', 'en', 'Create Event', 'admin'),
  ('admin.events.edit', 'en', 'Edit Event', 'admin'),
  ('admin.events.search', 'en', 'Search events...', 'admin'),
  ('admin.events.filters.all_status', 'en', 'All Status', 'admin'),
  ('admin.events.filters.draft', 'en', 'Draft', 'admin'),
  ('admin.events.filters.published', 'en', 'Published', 'admin'),
  ('admin.events.filters.cancelled', 'en', 'Cancelled', 'admin'),
  ('admin.events.filters.clear', 'en', 'Clear Filters', 'admin'),
  
  -- Event form translations
  ('admin.events.form.title', 'en', 'Event Title', 'admin'),
  ('admin.events.form.description', 'en', 'Description', 'admin'),
  ('admin.events.form.date', 'en', 'Date', 'admin'),
  ('admin.events.form.time', 'en', 'Time', 'admin'),
  ('admin.events.form.location', 'en', 'Location', 'admin'),
  ('admin.events.form.image', 'en', 'Image URL', 'admin'),
  ('admin.events.form.price', 'en', 'Price', 'admin'),
  ('admin.events.form.capacity', 'en', 'Total Capacity', 'admin'),
  ('admin.events.form.categories', 'en', 'Categories', 'admin'),
  ('admin.events.form.ticket_types', 'en', 'Ticket Types', 'admin'),
  ('admin.events.form.add_ticket_type', 'en', 'Add Ticket Type', 'admin'),
  ('admin.events.form.remove_ticket_type', 'en', 'Remove Ticket Type', 'admin'),
  ('admin.events.form.cancel', 'en', 'Cancel', 'admin'),
  ('admin.events.form.save', 'en', 'Save Event', 'admin'),
  ('admin.events.form.creating', 'en', 'Creating Event...', 'admin'),
  ('admin.events.form.updating', 'en', 'Updating Event...', 'admin'),

  -- Ticket type form translations
  ('admin.events.ticket_type.name', 'en', 'Ticket Name', 'admin'),
  ('admin.events.ticket_type.description', 'en', 'Description', 'admin'),
  ('admin.events.ticket_type.price', 'en', 'Price', 'admin'),
  ('admin.events.ticket_type.quantity', 'en', 'Quantity Available', 'admin'),
  ('admin.events.ticket_type.max_per_order', 'en', 'Max Per Order', 'admin'),

  -- Success/Error messages
  ('admin.events.success.create', 'en', 'Event created successfully', 'admin'),
  ('admin.events.success.update', 'en', 'Event updated successfully', 'admin'),
  ('admin.events.success.delete', 'en', 'Event deleted successfully', 'admin'),
  ('admin.events.error.create', 'en', 'Failed to create event', 'admin'),
  ('admin.events.error.update', 'en', 'Failed to update event', 'admin'),
  ('admin.events.error.delete', 'en', 'Failed to delete event', 'admin'),
  ('admin.events.error.load', 'en', 'Failed to load events', 'admin'),

  -- French translations
  ('admin.events.title', 'fr', 'Gestion des Événements', 'admin'),
  ('admin.events.create', 'fr', 'Créer un Événement', 'admin'),
  ('admin.events.edit', 'fr', 'Modifier l''Événement', 'admin'),
  ('admin.events.search', 'fr', 'Rechercher des événements...', 'admin'),
  ('admin.events.filters.all_status', 'fr', 'Tous les Statuts', 'admin'),
  ('admin.events.filters.draft', 'fr', 'Brouillon', 'admin'),
  ('admin.events.filters.published', 'fr', 'Publié', 'admin'),
  ('admin.events.filters.cancelled', 'fr', 'Annulé', 'admin'),
  ('admin.events.filters.clear', 'fr', 'Effacer les Filtres', 'admin'),
  
  -- Event form translations
  ('admin.events.form.title', 'fr', 'Titre de l''Événement', 'admin'),
  ('admin.events.form.description', 'fr', 'Description', 'admin'),
  ('admin.events.form.date', 'fr', 'Date', 'admin'),
  ('admin.events.form.time', 'fr', 'Heure', 'admin'),
  ('admin.events.form.location', 'fr', 'Lieu', 'admin'),
  ('admin.events.form.image', 'fr', 'URL de l''Image', 'admin'),
  ('admin.events.form.price', 'fr', 'Prix', 'admin'),
  ('admin.events.form.capacity', 'fr', 'Capacité Totale', 'admin'),
  ('admin.events.form.categories', 'fr', 'Catégories', 'admin'),
  ('admin.events.form.ticket_types', 'fr', 'Types de Billets', 'admin'),
  ('admin.events.form.add_ticket_type', 'fr', 'Ajouter un Type de Billet', 'admin'),
  ('admin.events.form.remove_ticket_type', 'fr', 'Supprimer le Type de Billet', 'admin'),
  ('admin.events.form.cancel', 'fr', 'Annuler', 'admin'),
  ('admin.events.form.save', 'fr', 'Enregistrer l''Événement', 'admin'),
  ('admin.events.form.creating', 'fr', 'Création de l''Événement...', 'admin'),
  ('admin.events.form.updating', 'fr', 'Mise à Jour de l''Événement...', 'admin'),

  -- Ticket type form translations
  ('admin.events.ticket_type.name', 'fr', 'Nom du Billet', 'admin'),
  ('admin.events.ticket_type.description', 'fr', 'Description', 'admin'),
  ('admin.events.ticket_type.price', 'fr', 'Prix', 'admin'),
  ('admin.events.ticket_type.quantity', 'fr', 'Quantité Disponible', 'admin'),
  ('admin.events.ticket_type.max_per_order', 'fr', 'Maximum par Commande', 'admin'),

  -- Success/Error messages
  ('admin.events.success.create', 'fr', 'Événement créé avec succès', 'admin'),
  ('admin.events.success.update', 'fr', 'Événement mis à jour avec succès', 'admin'),
  ('admin.events.success.delete', 'fr', 'Événement supprimé avec succès', 'admin'),
  ('admin.events.error.create', 'fr', 'Échec de la création de l''événement', 'admin'),
  ('admin.events.error.update', 'fr', 'Échec de la mise à jour de l''événement', 'admin'),
  ('admin.events.error.delete', 'fr', 'Échec de la suppression de l''événement', 'admin'),
  ('admin.events.error.load', 'fr', 'Échec du chargement des événements', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;