-- Insert event management table translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English table header translations
  ('admin.events.table.event', 'en', 'Event', 'admin'),
  ('admin.events.table.date_time', 'en', 'Date & Time', 'admin'),
  ('admin.events.table.location', 'en', 'Location', 'admin'),
  ('admin.events.table.status', 'en', 'Status', 'admin'),
  ('admin.events.table.tickets', 'en', 'Tickets', 'admin'),
  ('admin.events.table.actions', 'en', 'Actions', 'admin'),

  -- French table header translations
  ('admin.events.table.event', 'fr', 'Événement', 'admin'),
  ('admin.events.table.date_time', 'fr', 'Date & Heure', 'admin'),
  ('admin.events.table.location', 'fr', 'Lieu', 'admin'),
  ('admin.events.table.status', 'fr', 'Statut', 'admin'),
  ('admin.events.table.tickets', 'fr', 'Billets', 'admin'),
  ('admin.events.table.actions', 'fr', 'Actions', 'admin'),

  -- English status translations
  ('admin.events.status.draft', 'en', 'Draft', 'admin'),
  ('admin.events.status.published', 'en', 'Published', 'admin'),
  ('admin.events.status.cancelled', 'en', 'Cancelled', 'admin'),
  ('admin.events.featured', 'en', 'Mark as featured', 'admin'),
  ('admin.events.unfeatured', 'en', 'Remove from featured', 'admin'),
  ('admin.events.edit', 'en', 'Edit event', 'admin'),
  ('admin.events.delete', 'en', 'Delete event', 'admin'),
  ('admin.events.confirm_delete', 'en', 'Are you sure you want to delete this event?', 'admin'),

  -- French status translations
  ('admin.events.status.draft', 'fr', 'Brouillon', 'admin'),
  ('admin.events.status.published', 'fr', 'Publié', 'admin'),
  ('admin.events.status.cancelled', 'fr', 'Annulé', 'admin'),
  ('admin.events.featured', 'fr', 'Marquer comme à la une', 'admin'),
  ('admin.events.unfeatured', 'fr', 'Retirer de la une', 'admin'),
  ('admin.events.edit', 'fr', 'Modifier l''événement', 'admin'),
  ('admin.events.delete', 'fr', 'Supprimer l''événement', 'admin'),
  ('admin.events.confirm_delete', 'fr', 'Êtes-vous sûr de vouloir supprimer cet événement ?', 'admin'),

  -- English filter translations
  ('admin.events.filters.all_status', 'en', 'All Status', 'admin'),
  ('admin.events.filters.draft', 'en', 'Draft', 'admin'),
  ('admin.events.filters.published', 'en', 'Published', 'admin'),
  ('admin.events.filters.cancelled', 'en', 'Cancelled', 'admin'),
  ('admin.events.filters.clear', 'en', 'Clear Filters', 'admin'),
  ('admin.events.search', 'en', 'Search events...', 'admin'),

  -- French filter translations
  ('admin.events.filters.all_status', 'fr', 'Tous les Statuts', 'admin'),
  ('admin.events.filters.draft', 'fr', 'Brouillon', 'admin'),
  ('admin.events.filters.published', 'fr', 'Publié', 'admin'),
  ('admin.events.filters.cancelled', 'fr', 'Annulé', 'admin'),
  ('admin.events.filters.clear', 'fr', 'Effacer les Filtres', 'admin'),
  ('admin.events.search', 'fr', 'Rechercher des événements...', 'admin'),

  -- English success/error messages
  ('admin.events.success.update', 'en', 'Event status updated successfully', 'admin'),
  ('admin.events.success.featured', 'en', 'Event marked as featured', 'admin'),
  ('admin.events.success.unfeatured', 'en', 'Event removed from featured', 'admin'),
  ('admin.events.success.delete', 'en', 'Event deleted successfully', 'admin'),
  ('admin.events.error.update', 'en', 'Failed to update event status', 'admin'),
  ('admin.events.error.featured', 'en', 'Failed to update featured status', 'admin'),
  ('admin.events.error.delete', 'en', 'Failed to delete event', 'admin'),
  ('admin.events.error.load', 'en', 'Failed to load events', 'admin'),

  -- French success/error messages
  ('admin.events.success.update', 'fr', 'Statut de l''événement mis à jour avec succès', 'admin'),
  ('admin.events.success.featured', 'fr', 'Événement marqué comme à la une', 'admin'),
  ('admin.events.success.unfeatured', 'fr', 'Événement retiré de la une', 'admin'),
  ('admin.events.success.delete', 'fr', 'Événement supprimé avec succès', 'admin'),
  ('admin.events.error.update', 'fr', 'Échec de la mise à jour du statut de l''événement', 'admin'),
  ('admin.events.error.featured', 'fr', 'Échec de la mise à jour du statut à la une', 'admin'),
  ('admin.events.error.delete', 'fr', 'Échec de la suppression de l''événement', 'admin'),
  ('admin.events.error.load', 'fr', 'Échec du chargement des événements', 'admin')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;