-- Insert notification type translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('notifications.types.title', 'en', 'Notification Types', 'notifications'),
  ('notifications.types.EVENT_REMINDER.label', 'en', 'Event Reminders', 'notifications'),
  ('notifications.types.EVENT_REMINDER.description', 'en', 'Get notified before your events start', 'notifications'),
  ('notifications.types.TICKET_PURCHASED.label', 'en', 'Ticket Purchases', 'notifications'),
  ('notifications.types.TICKET_PURCHASED.description', 'en', 'Receive confirmations for ticket purchases', 'notifications'),
  ('notifications.types.PRICE_CHANGE.label', 'en', 'Price Changes', 'notifications'),
  ('notifications.types.PRICE_CHANGE.description', 'en', 'Get notified when event prices change', 'notifications'),
  ('notifications.types.EVENT_CANCELLED.label', 'en', 'Event Cancellations', 'notifications'),
  ('notifications.types.EVENT_CANCELLED.description', 'en', 'Be informed if an event is cancelled', 'notifications'),
  ('notifications.types.EVENT_UPDATED.label', 'en', 'Event Updates', 'notifications'),
  ('notifications.types.EVENT_UPDATED.description', 'en', 'Receive updates about events you are attending', 'notifications'),

  -- French translations
  ('notifications.types.title', 'fr', 'Types de Notifications', 'notifications'),
  ('notifications.types.EVENT_REMINDER.label', 'fr', 'Rappels d''Événements', 'notifications'),
  ('notifications.types.EVENT_REMINDER.description', 'fr', 'Soyez notifié avant le début de vos événements', 'notifications'),
  ('notifications.types.TICKET_PURCHASED.label', 'fr', 'Achats de Billets', 'notifications'),
  ('notifications.types.TICKET_PURCHASED.description', 'fr', 'Recevez les confirmations d''achat de billets', 'notifications'),
  ('notifications.types.PRICE_CHANGE.label', 'fr', 'Changements de Prix', 'notifications'),
  ('notifications.types.PRICE_CHANGE.description', 'fr', 'Soyez notifié des changements de prix des événements', 'notifications'),
  ('notifications.types.EVENT_CANCELLED.label', 'fr', 'Annulations d''Événements', 'notifications'),
  ('notifications.types.EVENT_CANCELLED.description', 'fr', 'Soyez informé si un événement est annulé', 'notifications'),
  ('notifications.types.EVENT_UPDATED.label', 'fr', 'Mises à Jour d''Événements', 'notifications'),
  ('notifications.types.EVENT_UPDATED.description', 'fr', 'Recevez les mises à jour des événements auxquels vous participez', 'notifications')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;