import { supabase } from '../lib/supabase-client';

export interface OrderData {
  id: string;
  user_id: string;
  event_id?: string;
  total_amount: number;
  currency: string;
  ticket_lines?: Array<{
    ticket_type_id: string;
    quantity: number;
    price: number;
  }>;
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  location?: string;
}

export interface TicketTransferData {
  id: string;
  sender_id: string;
  recipient_id: string;
  ticket_id: string;
  event_title?: string;
}

export interface SupportTicketData {
  id: string;
  user_id: string;
  subject: string;
  status: string;
}

class MobileNotificationTriggers {
  // Trigger order confirmation notification
  async onOrderCreated(orderData: OrderData): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get event details if available
      let eventTitle = 'votre commande';
      if (orderData.event_id) {
        const { data: event } = await supabase
          .from('events')
          .select('title')
          .eq('id', orderData.event_id)
          .single();
        
        if (event) {
          eventTitle = event.title;
        }
      }

      const notification = {
        user_id: orderData.user_id,
        type: 'ORDER_CONFIRMATION',
        title: '✅ Commande confirmée',
        message: `Votre commande pour ${eventTitle} a été confirmée. Montant: ${orderData.total_amount / 100} ${orderData.currency}`,
        priority: 'high',
        action_url: `/booking/confirmation/${orderData.id}`,
        action_text: 'Voir les billets',
        metadata: {
          order_id: orderData.id,
          event_id: orderData.event_id,
          amount: orderData.total_amount,
          currency: orderData.currency
        }
      };

      await this.createNotification(notification);
      
    } catch (error) {
      console.error('Error triggering order confirmation notification:', error);
    }
  }

  // Trigger event reminder notification
  async onEventReminder(eventData: EventData, reminderType: '24h' | '1h'): Promise<void> {
    try {
      // Get all users with tickets for this event
      const { data: tickets } = await supabase
        .from('tickets')
        .select('user_id')
        .eq('event_id', eventData.id)
        .eq('status', 'ACTIVE');

      if (!tickets || tickets.length === 0) return;

      const uniqueUserIds = [...new Set(tickets.map(t => t.user_id))];
      
      const reminderText = reminderType === '24h' ? 'demain' : 'dans 1 heure';
      const timeEmoji = reminderType === '24h' ? '📅' : '⏰';

      const notifications = uniqueUserIds.map(userId => ({
        user_id: userId,
        type: 'EVENT_REMINDER',
        title: `${timeEmoji} Rappel d'événement`,
        message: `${eventData.title} commence ${reminderText}${eventData.location ? ` à ${eventData.location}` : ''}`,
        priority: reminderType === '1h' ? 'high' : 'normal',
        action_url: `/events/${eventData.id}`,
        action_text: 'Voir l\'événement',
        metadata: {
          event_id: eventData.id,
          reminder_type: reminderType,
          event_date: eventData.date,
          location: eventData.location
        }
      }));

      await this.createBulkNotifications(notifications);
      
    } catch (error) {
      console.error('Error triggering event reminder notifications:', error);
    }
  }

  // Trigger ticket transfer notification
  async onTicketTransfer(transferData: TicketTransferData): Promise<void> {
    try {
      // Notification for recipient
      const recipientNotification = {
        user_id: transferData.recipient_id,
        type: 'TICKET_TRANSFER',
        title: '🎫 Billet reçu',
        message: `Vous avez reçu un billet${transferData.event_title ? ` pour ${transferData.event_title}` : ''}`,
        priority: 'normal',
        action_url: `/profile/tickets`,
        action_text: 'Voir mes billets',
        metadata: {
          transfer_id: transferData.id,
          ticket_id: transferData.ticket_id,
          sender_id: transferData.sender_id,
          event_title: transferData.event_title
        }
      };

      // Notification for sender
      const senderNotification = {
        user_id: transferData.sender_id,
        type: 'TICKET_TRANSFER',
        title: '📤 Transfert confirmé',
        message: `Votre billet${transferData.event_title ? ` pour ${transferData.event_title}` : ''} a été transféré avec succès`,
        priority: 'normal',
        action_url: `/profile/tickets`,
        action_text: 'Voir mes billets',
        metadata: {
          transfer_id: transferData.id,
          ticket_id: transferData.ticket_id,
          recipient_id: transferData.recipient_id,
          event_title: transferData.event_title
        }
      };

      await this.createBulkNotifications([recipientNotification, senderNotification]);
      
    } catch (error) {
      console.error('Error triggering ticket transfer notifications:', error);
    }
  }

  // Trigger support reply notification
  async onSupportReply(ticketData: SupportTicketData): Promise<void> {
    try {
      const notification = {
        user_id: ticketData.user_id,
        type: 'SUPPORT_REPLY',
        title: '💬 Nouvelle réponse du support',
        message: `Une réponse a été ajoutée à votre demande: ${ticketData.subject}`,
        priority: 'normal',
        action_url: `/support/${ticketData.id}`,
        action_text: 'Voir la réponse',
        metadata: {
          support_ticket_id: ticketData.id,
          subject: ticketData.subject,
          status: ticketData.status
        }
      };

      await this.createNotification(notification);
      
    } catch (error) {
      console.error('Error triggering support reply notification:', error);
    }
  }

  // Trigger account update notification
  async onAccountUpdate(userId: string, updateType: string, details: string): Promise<void> {
    try {
      let title = '👤 Compte mis à jour';
      let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

      switch (updateType) {
        case 'password_changed':
          title = '🔐 Mot de passe modifié';
          priority = 'high';
          break;
        case 'email_changed':
          title = '📧 Email modifié';
          priority = 'high';
          break;
        case 'profile_updated':
          title = '👤 Profil mis à jour';
          priority = 'low';
          break;
        case 'security_alert':
          title = '⚠️ Alerte de sécurité';
          priority = 'urgent';
          break;
      }

      const notification = {
        user_id: userId,
        type: 'ACCOUNT_UPDATE',
        title,
        message: details,
        priority,
        action_url: '/profile/settings',
        action_text: 'Voir le profil',
        metadata: {
          update_type: updateType,
          timestamp: new Date().toISOString()
        }
      };

      await this.createNotification(notification);
      
    } catch (error) {
      console.error('Error triggering account update notification:', error);
    }
  }

  // Trigger system notification
  async onSystemNotification(
    userIds: string[], 
    title: string, 
    message: string, 
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    actionUrl?: string,
    actionText?: string
  ): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'SYSTEM',
        title,
        message,
        priority,
        action_url: actionUrl || null,
        action_text: actionText || null,
        metadata: {
          system_notification: true,
          timestamp: new Date().toISOString()
        }
      }));

      await this.createBulkNotifications(notifications);
      
    } catch (error) {
      console.error('Error triggering system notifications:', error);
    }
  }

  // Trigger price change notification
  async onPriceChange(eventId: string, oldPrice: number, newPrice: number): Promise<void> {
    try {
      // Get users who have shown interest in this event (you might have a favorites or watchlist table)
      // For now, we'll notify all users with tickets to similar events
      
      const { data: event } = await supabase
        .from('events')
        .select('title, category_id')
        .eq('id', eventId)
        .single();

      if (!event) return;

      const priceChange = newPrice > oldPrice ? 'augmenté' : 'diminué';
      const emoji = newPrice > oldPrice ? '📈' : '📉';

      // This is a simplified implementation - you'd want to be more selective about who gets these notifications
      const notification = {
        type: 'PRICE_CHANGE',
        title: `${emoji} Prix ${priceChange}`,
        message: `Le prix pour ${event.title} a ${priceChange} de ${oldPrice / 100}€ à ${newPrice / 100}€`,
        priority: 'low' as const,
        action_url: `/events/${eventId}`,
        action_text: 'Voir l\'événement',
        metadata: {
          event_id: eventId,
          old_price: oldPrice,
          new_price: newPrice,
          price_change: priceChange
        }
      };

      // You would implement logic here to determine which users should receive this notification
      // For example, users who have the event in their favorites or have attended similar events
      
    } catch (error) {
      console.error('Error triggering price change notification:', error);
    }
  }

  // Helper method to create a single notification
  private async createNotification(notification: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          read: 'false',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Helper method to create multiple notifications
  private async createBulkNotifications(notifications: any[]): Promise<void> {
    try {
      const notificationsWithDefaults = notifications.map(notification => ({
        ...notification,
        read: 'false',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsWithDefaults);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
}

export const mobileNotificationTriggers = new MobileNotificationTriggers();
