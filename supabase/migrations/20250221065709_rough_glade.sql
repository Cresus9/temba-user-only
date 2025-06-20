-- Insert notification translations
INSERT INTO translations (key, locale, content, namespace) VALUES
  -- English translations
  ('notifications.channels.title', 'en', 'Notification Channels', 'notifications'),
  ('notifications.channels.email.title', 'en', 'Email Notifications', 'notifications'),
  ('notifications.channels.email.description', 'en', 'Receive notifications via email', 'notifications'),
  ('notifications.channels.push.title', 'en', 'Push Notifications', 'notifications'),
  ('notifications.channels.push.description', 'en', 'Receive notifications in your browser', 'notifications'),
  ('notifications.push.enable_title', 'en', 'Enable Push Notifications', 'notifications'),
  ('notifications.push.enable_steps', 'en', '1. Click the lock icon in your browser''s address bar\n2. Find "Notifications" in the permissions list\n3. Change the setting to "Allow"', 'notifications'),
  ('notifications.push.enable_browser', 'en', 'Enable in browser', 'notifications'),
  ('notifications.push.not_supported', 'en', 'Not supported in your browser', 'notifications'),
  
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

  ('notifications.error.load', 'en', 'Failed to load notification preferences', 'notifications'),
  ('notifications.error.load_title', 'en', 'Failed to load preferences', 'notifications'),
  ('notifications.error.update', 'en', 'Failed to update notification preferences', 'notifications'),
  ('notifications.error.update_type', 'en', 'Failed to update notification type', 'notifications'),
  ('notifications.error.push_blocked', 'en', 'Push notifications are blocked. Please enable them in your browser settings.', 'notifications'),
  
  ('notifications.updated', 'en', '{channel} notifications {status}', 'notifications'),
  ('notifications.type_updated', 'en', '{type} {status}', 'notifications'),

  -- French translations
  ('notifications.channels.title', 'fr', 'Canaux de Notification', 'notifications'),
  ('notifications.channels.email.title', 'fr', 'Notifications par Email', 'notifications'),
  ('notifications.channels.email.description', 'fr', 'Recevoir les notifications par email', 'notifications'),
  ('notifications.channels.push.title', 'fr', 'Notifications Push', 'notifications'),
  ('notifications.channels.push.description', 'fr', 'Recevoir les notifications dans votre navigateur', 'notifications'),
  ('notifications.push.enable_title', 'fr', 'Activer les Notifications Push', 'notifications'),
  ('notifications.push.enable_steps', 'fr', '1. Cliquez sur l''icône de verrouillage dans la barre d''adresse\n2. Trouvez "Notifications" dans la liste des permissions\n3. Changez le paramètre sur "Autoriser"', 'notifications'),
  ('notifications.push.enable_browser', 'fr', 'Activer dans le navigateur', 'notifications'),
  ('notifications.push.not_supported', 'fr', 'Non pris en charge dans votre navigateur', 'notifications'),
  
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
  ('notifications.types.EVENT_UPDATED.description', 'fr', 'Recevez les mises à jour des événements auxquels vous participez', 'notifications'),

  ('notifications.error.load', 'fr', 'Échec du chargement des préférences de notification', 'notifications'),
  ('notifications.error.load_title', 'fr', 'Échec du chargement des préférences', 'notifications'),
  ('notifications.error.update', 'fr', 'Échec de la mise à jour des préférences de notification', 'notifications'),
  ('notifications.error.update_type', 'fr', 'Échec de la mise à jour du type de notification', 'notifications'),
  ('notifications.error.push_blocked', 'fr', 'Les notifications push sont bloquées. Veuillez les activer dans les paramètres de votre navigateur.', 'notifications'),
  
  ('notifications.updated', 'fr', 'Notifications {channel} {status}', 'notifications'),
  ('notifications.type_updated', 'fr', '{type} {status}', 'notifications')
ON CONFLICT (key, locale) DO UPDATE
SET content = EXCLUDED.content;