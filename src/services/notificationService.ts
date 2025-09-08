import { supabase } from '../lib/supabase-client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;  // Your table uses 'metadata' instead of 'data'
  read: string;    // Your table uses 'read' as string instead of 'read_at' as date
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

class NotificationService {
  async getUserNotifications(limit = 10): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('email, push, types')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // no rows

    return data || { email: true, push: false, types: [] };
  }

  async updatePreferences(prefs: NotificationPreferences): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', 'false')  // Your table uses 'read' as string 'true'/'false'
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching unread notifications:', error);
      throw new Error(error.message || 'Failed to fetch unread notifications');
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      console.log(`🔄 NotificationService: Marking ${notificationId} as read in database...`);
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: 'true',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select(); // Add select to see what was updated

      if (error) {
        console.error(`❌ Database error marking ${notificationId} as read:`, error);
        throw error;
      }
      
      console.log(`✅ Database update result for ${notificationId}:`, data);
      return true;
    } catch (error: any) {
      console.error(`❌ Error marking notification ${notificationId} as read:`, error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: 'true',
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', 'false');

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  async getNotificationCount(): Promise<number> {
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
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: Notification) => void) {
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('❌ No authenticated user for notifications subscription');
          return null;
        }

        console.log('🔔 Setting up notifications subscription for user:', user.id);
        
        // Create a unique channel name
        const channelName = `notifications-${user.id}-${Date.now()}`;
        
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
              console.log('🔔 Received notification via realtime:', payload);
              console.log('📝 Notification data:', payload.new);
              callback(payload.new as Notification);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('🔄 Notification updated via realtime:', payload);
            }
          )
          .subscribe((status, err) => {
            console.log('📡 Notification subscription status:', status);
            if (err) {
              console.error('❌ Subscription error:', err);
            }
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to notifications');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error - realtime may not be enabled for notifications table');
            } else if (status === 'TIMED_OUT') {
              console.error('❌ Subscription timed out');
            } else if (status === 'CLOSED') {
              console.log('🔐 Subscription closed');
            }
          });

        return channel;
      } catch (error) {
        console.error('❌ Error setting up notifications subscription:', error);
        return null;
      }
    };

    const channelPromise = setupSubscription();
    
    return {
      unsubscribe: () => {
        channelPromise.then(channel => {
          if (channel) {
            console.log('🔕 Unsubscribing from notifications');
            supabase.removeChannel(channel);
          }
        });
      }
    };
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  // Get notifications with pagination
  async getNotifications(page = 1, limit = 20): Promise<{ notifications: Notification[]; hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return {
        notifications: data || [],
        hasMore: (count || 0) > offset + limit
      };
    } catch (error: any) {
      console.error('Error fetching paginated notifications:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }
}

export const notificationService = new NotificationService();