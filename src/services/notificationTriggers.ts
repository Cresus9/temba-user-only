import { supabase } from '../lib/supabase-client';

export interface NotificationTriggerData {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
}

class NotificationTriggers {
  // Order confirmations
  async onOrderCreated(orderData: {
    order_id: string;
    user_id: string;
    event_title: string;
    total_amount: number;
    currency: string;
    ticket_count: number;
  }) {
    const notification: NotificationTriggerData = {
      user_id: orderData.user_id,
      type: 'ORDER_CONFIRMATION',
      title: 'Commande confirmée',
      message: `Votre commande pour ${orderData.event_title} a été confirmée. ${orderData.ticket_count} billet${orderData.ticket_count > 1 ? 's' : ''} pour ${orderData.total_amount} ${orderData.currency}.`,
      priority: 'high',
      data: {
        order_id: orderData.order_id,
        event_title: orderData.event_title,
        total_amount: orderData.total_amount,
        currency: orderData.currency,
        ticket_count: orderData.ticket_count,
      },
      action_url: `/booking/confirmation/${orderData.order_id}`,
      action_text: 'Voir mes billets'
    };

    return this.createNotification(notification);
  }

  // Event reminders
  async onEventReminder(eventData: {
    user_id: string;
    event_id: string;
    event_title: string;
    event_date: string;
    event_time: string;
    venue: string;
    hours_until_event: number;
  }) {
    const timeText = eventData.hours_until_event <= 1 ? '1 heure' : `${eventData.hours_until_event} heures`;
    
    const notification: NotificationTriggerData = {
      user_id: eventData.user_id,
      type: 'EVENT_REMINDER',
      title: `Rappel: ${eventData.event_title}`,
      message: `Votre événement commence dans ${timeText}. Lieu: ${eventData.venue}`,
      priority: eventData.hours_until_event <= 1 ? 'urgent' : 'high',
      data: {
        event_id: eventData.event_id,
        event_title: eventData.event_title,
        event_date: eventData.event_date,
        event_time: eventData.event_time,
        venue: eventData.venue,
        hours_until_event: eventData.hours_until_event,
      },
      action_url: `/events/${eventData.event_id}`,
      action_text: 'Voir l\'événement'
    };

    return this.createNotification(notification);
  }

  // Ticket transfers
  async onTicketTransferReceived(transferData: {
    recipient_user_id: string;
    sender_name: string;
    ticket_id: string;
    event_title: string;
  }) {
    const notification: NotificationTriggerData = {
      user_id: transferData.recipient_user_id,
      type: 'TICKET_TRANSFER',
      title: 'Billet reçu',
      message: `${transferData.sender_name} vous a transféré un billet pour ${transferData.event_title}.`,
      priority: 'high',
      data: {
        ticket_id: transferData.ticket_id,
        event_title: transferData.event_title,
        sender_name: transferData.sender_name,
      },
      action_url: `/profile/tickets`,
      action_text: 'Voir mes billets'
    };

    return this.createNotification(notification);
  }

  async onTicketTransferSent(transferData: {
    sender_user_id: string;
    recipient_name: string;
    ticket_id: string;
    event_title: string;
  }) {
    const notification: NotificationTriggerData = {
      user_id: transferData.sender_user_id,
      type: 'TICKET_TRANSFER',
      title: 'Billet transféré',
      message: `Votre billet pour ${transferData.event_title} a été transféré à ${transferData.recipient_name}.`,
      priority: 'normal',
      data: {
        ticket_id: transferData.ticket_id,
        event_title: transferData.event_title,
        recipient_name: transferData.recipient_name,
      },
      action_url: `/profile/tickets`,
      action_text: 'Voir mes billets'
    };

    return this.createNotification(notification);
  }

  // Support replies
  async onSupportReply(supportData: {
    user_id: string;
    ticket_id: string;
    subject: string;
    admin_name: string;
  }) {
    const notification: NotificationTriggerData = {
      user_id: supportData.user_id,
      type: 'SUPPORT_REPLY',
      title: 'Réponse du support',
      message: `${supportData.admin_name} a répondu à votre ticket de support: ${supportData.subject}`,
      priority: 'high',
      data: {
        support_ticket_id: supportData.ticket_id,
        subject: supportData.subject,
        admin_name: supportData.admin_name,
      },
      action_url: `/support/${supportData.ticket_id}`,
      action_text: 'Voir la réponse'
    };

    return this.createNotification(notification);
  }

  // Account updates
  async onPasswordChanged(user_id: string) {
    const notification: NotificationTriggerData = {
      user_id,
      type: 'ACCOUNT_UPDATE',
      title: 'Mot de passe modifié',
      message: 'Votre mot de passe a été modifié avec succès. Si ce n\'était pas vous, contactez le support.',
      priority: 'high',
      data: {
        change_type: 'password',
      },
      action_url: '/profile/settings',
      action_text: 'Voir les paramètres'
    };

    return this.createNotification(notification);
  }

  async onEmailChanged(user_id: string, new_email: string) {
    const notification: NotificationTriggerData = {
      user_id,
      type: 'ACCOUNT_UPDATE',
      title: 'Email modifié',
      message: `Votre adresse email a été modifiée vers ${new_email}. Si ce n'était pas vous, contactez le support.`,
      priority: 'high',
      data: {
        change_type: 'email',
        new_email,
      },
      action_url: '/profile/settings',
      action_text: 'Voir les paramètres'
    };

    return this.createNotification(notification);
  }

  // Event updates
  async onEventCancelled(eventData: {
    user_ids: string[];
    event_id: string;
    event_title: string;
    event_date: string;
    refund_info?: string;
  }) {
    const notifications = eventData.user_ids.map(user_id => ({
      user_id,
      type: 'EVENT_CANCELLED',
      title: 'Événement annulé',
      message: `L'événement ${eventData.event_title} prévu le ${new Date(eventData.event_date).toLocaleDateString('fr-FR')} a été annulé. ${eventData.refund_info || 'Vous serez remboursé automatiquement.'}`,
      priority: 'urgent' as const,
      data: {
        event_id: eventData.event_id,
        event_title: eventData.event_title,
        event_date: eventData.event_date,
        refund_info: eventData.refund_info,
      },
      action_url: `/events/${eventData.event_id}`,
      action_text: 'Voir les détails'
    }));

    return Promise.all(notifications.map(notification => this.createNotification(notification)));
  }

  async onEventUpdated(eventData: {
    user_ids: string[];
    event_id: string;
    event_title: string;
    changes: string[];
  }) {
    const changesText = eventData.changes.join(', ');
    
    const notifications = eventData.user_ids.map(user_id => ({
      user_id,
      type: 'EVENT_UPDATED',
      title: 'Événement mis à jour',
      message: `L'événement ${eventData.event_title} a été mis à jour: ${changesText}`,
      priority: 'normal' as const,
      data: {
        event_id: eventData.event_id,
        event_title: eventData.event_title,
        changes: eventData.changes,
      },
      action_url: `/events/${eventData.event_id}`,
      action_text: 'Voir les changements'
    }));

    return Promise.all(notifications.map(notification => this.createNotification(notification)));
  }

  // Price changes
  async onPriceChange(priceData: {
    user_ids: string[];
    event_id: string;
    event_title: string;
    old_price: number;
    new_price: number;
    currency: string;
  }) {
    const priceChange = priceData.new_price > priceData.old_price ? 'augmenté' : 'réduit';
    
    const notifications = priceData.user_ids.map(user_id => ({
      user_id,
      type: 'PRICE_CHANGE',
      title: 'Prix modifié',
      message: `Le prix de ${priceData.event_title} a ${priceChange} de ${priceData.old_price} ${priceData.currency} à ${priceData.new_price} ${priceData.currency}`,
      priority: 'normal' as const,
      data: {
        event_id: priceData.event_id,
        event_title: priceData.event_title,
        old_price: priceData.old_price,
        new_price: priceData.new_price,
        currency: priceData.currency,
      },
      action_url: `/events/${priceData.event_id}`,
      action_text: 'Voir l\'événement'
    }));

    return Promise.all(notifications.map(notification => this.createNotification(notification)));
  }

  // System notifications
  async onSystemMaintenance(maintenanceData: {
    user_ids: string[];
    start_time: string;
    end_time: string;
    description?: string;
  }) {
    const startDate = new Date(maintenanceData.start_time).toLocaleDateString('fr-FR');
    const startTime = new Date(maintenanceData.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(maintenanceData.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const notifications = maintenanceData.user_ids.map(user_id => ({
      user_id,
      type: 'SYSTEM',
      title: 'Maintenance programmée',
      message: `Maintenance du système prévue le ${startDate} de ${startTime} à ${endTime}. ${maintenanceData.description || 'Certains services peuvent être temporairement indisponibles.'}`,
      priority: 'normal' as const,
      data: {
        start_time: maintenanceData.start_time,
        end_time: maintenanceData.end_time,
        description: maintenanceData.description,
      }
    }));

    return Promise.all(notifications.map(notification => this.createNotification(notification)));
  }

  // Generic notification creator
  private async createNotification(notificationData: NotificationTriggerData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority || 'normal',
          read: 'false',
          action_url: notificationData.action_url,
          action_text: notificationData.action_text,
          metadata: {
            ...notificationData.data,
            priority: notificationData.priority || 'normal',
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw new Error(error.message || 'Failed to create notification');
    }
  }
}

export const notificationTriggers = new NotificationTriggers();
