import { supabase } from '../lib/supabase-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface MobileNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  read: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  category_id?: string | null;
  template_id?: string | null;
  priority: string;
  action_url?: string | null;
  action_text?: string | null;
  expires_at?: string | null;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  types: string[];
}

class MobileNotificationService {
  private subscriptions: Map<string, any> = new Map();

  // Configure push notifications
  async configurePushNotifications() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted');
        return false;
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);
      
      // Save token to user preferences
      await this.savePushToken(token);
      
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const priority = notification.request.content.data?.priority || 'normal';
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: priority === 'urgent' || priority === 'high',
            shouldSetBadge: true,
          };
        },
      });

      return true;
    } catch (error) {
      console.error('Error configuring push notifications:', error);
      return false;
    }
  }

  // Save push token to database
  private async savePushToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_push_tokens')
        .upsert({ 
          user_id: user.id, 
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(limit = 20, offset = 0): Promise<MobileNotification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  // Get unread notifications count
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', 'false');

      if (error) throw error;
      return count || 0;
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: 'true',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select();

      if (error) throw error;
      
      // Update badge count
      await this.updateBadgeCount();
      
      return true;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: 'true',
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', 'false');

      if (error) throw error;
      
      // Clear badge
      await Notifications.setBadgeCountAsync(0);
      
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  // Update app badge count
  async updateBadgeCount() {
    try {
      const count = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: MobileNotification) => void) {
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        console.log('🔔 Setting up mobile notifications subscription for user:', user.id);
        
        const channelName = `mobile-notifications-${user.id}-${Date.now()}`;
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('📱 Received notification via realtime:', payload.new);
              callback(payload.new as MobileNotification);
              
              // Update badge count
              this.updateBadgeCount();
              
              // Show local notification if app is in background
              this.showLocalNotification(payload.new as MobileNotification);
            }
          )
          .subscribe((status) => {
            console.log('📡 Mobile notification subscription status:', status);
          });

        this.subscriptions.set(user.id, channel);
        return channel;
      } catch (error) {
        console.error('❌ Error setting up mobile notifications subscription:', error);
        return null;
      }
    };

    setupSubscription();
    
    return {
      unsubscribe: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && this.subscriptions.has(user.id)) {
          const channel = this.subscriptions.get(user.id);
          supabase.removeChannel(channel);
          this.subscriptions.delete(user.id);
          console.log('🔕 Unsubscribed from mobile notifications');
        }
      }
    };
  }

  // Show local notification
  private async showLocalNotification(notification: MobileNotification) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.id,
            actionUrl: notification.action_url,
            priority: notification.priority
          },
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('email, push, types')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { email: true, push: true, types: [] };
    } catch (error: any) {
      console.error('Error getting preferences:', error);
      return { email: true, push: true, types: [] };
    }
  }

  // Update notification preferences
  async updatePreferences(prefs: NotificationPreferences): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      throw new Error(error.message || 'Failed to update preferences');
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      await Notifications.setBadgeCountAsync(0);
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      throw new Error(error.message || 'Failed to clear notifications');
    }
  }

  // Handle notification tap
  handleNotificationTap(notification: any, navigation: any) {
    const data = notification.request?.content?.data;
    
    if (data?.actionUrl) {
      // Handle deep linking
      this.handleDeepLink(data.actionUrl, navigation);
    }
    
    if (data?.notificationId) {
      // Mark as read
      this.markAsRead(data.notificationId);
    }
  }

  // Handle deep linking
  private handleDeepLink(url: string, navigation: any) {
    try {
      // Parse the URL and navigate accordingly
      if (url.includes('/booking/confirmation/')) {
        const orderId = url.split('/').pop();
        navigation.navigate('BookingConfirmation', { orderId });
      } else if (url.includes('/events/')) {
        const eventId = url.split('/').pop();
        navigation.navigate('EventDetails', { eventId });
      } else if (url.includes('/profile/tickets')) {
        navigation.navigate('MyTickets');
      } else if (url.includes('/support/')) {
        const ticketId = url.split('/').pop();
        navigation.navigate('SupportTicket', { ticketId });
      } else if (url.includes('/notifications')) {
        navigation.navigate('Notifications');
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  // Cleanup subscriptions
  cleanup() {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}

export const mobileNotificationService = new MobileNotificationService();
