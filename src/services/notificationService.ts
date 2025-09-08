import { supabase } from '../lib/supabase-client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read_at: string | null;
  created_at: string;
  updated_at: string;
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
        .is('read_at', null)
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
      const { data, error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  async getNotificationCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error: any) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: Notification) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(user => user.data.user?.id)}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  }
}

export const notificationService = new NotificationService();