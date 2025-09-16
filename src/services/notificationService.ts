import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
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

interface NotificationServiceOptions {
  supabaseClient?: SupabaseClient;
  logger?: Pick<Console, 'error' | 'warn'>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: false,
  types: [],
};

const MAX_LIMIT = 100;

export class NotificationService {
  private readonly client: SupabaseClient;
  private readonly logger: Pick<Console, 'error' | 'warn'>;

  constructor(options: NotificationServiceOptions = {}) {
    this.client = options.supabaseClient ?? supabase;
    this.logger = options.logger ?? console;
  }

  private normaliseLimit(value: number, fallback: number): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(Math.floor(parsed), MAX_LIMIT);
    }
    return fallback;
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      this.logger.error('Erreur lors de la récupération de l\'utilisateur authentifié:', error);
      throw new Error('Impossible de récupérer l\'utilisateur authentifié');
    }

    const userId = data?.user?.id;
    if (!userId) {
      throw new Error('Non authentifié');
    }

    return userId;
  }

  private async maybeGetUserId(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      this.logger.error('Erreur lors de la récupération de l\'utilisateur authentifié:', error);
      return null;
    }

    return data?.user?.id ?? null;
  }

  async getUserNotifications(limit = 10): Promise<Notification[]> {
    const userId = await this.requireUserId();
    const effectiveLimit = this.normaliseLimit(limit, 10);

    try {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(effectiveLimit);

      if (error) {
        throw error;
      }

      return data ?? [];
    } catch (error: unknown) {
      this.logger.error('Erreur lors du chargement des notifications:', error as Error);
      throw new Error('Échec du chargement des notifications');
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const userId = await this.requireUserId();

    try {
      const { data, error } = await this.client
        .from('notification_preferences')
        .select('email, push, types')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ?? { ...DEFAULT_PREFERENCES };
    } catch (error: unknown) {
      this.logger.error('Erreur lors du chargement des préférences de notification:', error as Error);
      throw new Error('Échec du chargement des préférences de notification');
    }
  }

  async updatePreferences(prefs: NotificationPreferences): Promise<void> {
    const userId = await this.requireUserId();

    try {
      const { error } = await this.client
        .from('notification_preferences')
        .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la mise à jour des préférences de notification:', error as Error);
      throw new Error('Échec de la mise à jour des préférences de notification');
    }
  }

  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
      return false;
    }

    try {
      const result = await window.Notification.requestPermission();
      return result === 'granted';
    } catch (error) {
      this.logger.error('Erreur lors de la demande de permission de notification push:', error as Error);
      return false;
    }
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const userId = await this.requireUserId();

    try {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', 'false')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
    } catch (error: unknown) {
      this.logger.error('Erreur lors du chargement des notifications non lues:', error as Error);
      throw new Error('Échec du chargement des notifications non lues');
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const userId = await this.requireUserId();

    try {
      const { data, error } = await this.client
        .from('notifications')
        .update({
          read: 'true',
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Notification introuvable');
      }

      return true;
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la mise à jour de la notification:', error as Error);
      const message = error instanceof Error && error.message !== 'Notification introuvable'
        ? 'Échec de la mise à jour de la notification'
        : error instanceof Error
          ? error.message
          : 'Échec de la mise à jour de la notification';
      throw new Error(message);
    }
  }

  async markAllAsRead(): Promise<void> {
    const userId = await this.requireUserId();

    try {
      const { error } = await this.client
        .from('notifications')
        .update({
          read: 'true',
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('read', 'false');

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la mise à jour des notifications:', error as Error);
      throw new Error('Échec de la mise à jour des notifications');
    }
  }

  async getNotificationCount(): Promise<number> {
    const userId = await this.maybeGetUserId();
    if (!userId) {
      return 0;
    }

    try {
      const { count, error } = await this.client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', 'false');

      if (error) {
        throw error;
      }

      return count ?? 0;
    } catch (error: unknown) {
      this.logger.error('Erreur lors du calcul du nombre de notifications:', error as Error);
      return 0;
    }
  }

  subscribeToNotifications(callback: (notification: Notification) => void) {
    const channelPromise: Promise<RealtimeChannel | null> = (async () => {
      const userId = await this.maybeGetUserId();
      if (!userId) {
        return null;
      }

      const channelName = `notifications-${userId}-${Date.now()}`;
      const channel = this.client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            callback(payload.new as Notification);
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            this.logger.error('Erreur lors de l\'abonnement aux notifications');
          }
          if (status === 'TIMED_OUT') {
            this.logger.warn?.('Expiration de l\'abonnement aux notifications');
          }
        });

      return channel;
    })();

    return {
      unsubscribe: async () => {
        try {
          const channel = await channelPromise;
          if (channel) {
            await channel.unsubscribe();
          }
        } catch (error) {
          this.logger.error('Erreur lors de la désinscription des notifications:', error as Error);
        }
      },
    };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const userId = await this.requireUserId();

    try {
      const { error, count } = await this.client
        .from('notifications')
        .delete({ count: 'exact' })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      if (!count) {
        throw new Error('Notification introuvable');
      }
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la suppression de la notification:', error as Error);
      const message = error instanceof Error && error.message === 'Notification introuvable'
        ? error.message
        : 'Échec de la suppression de la notification';
      throw new Error(message);
    }
  }

  async getNotifications(page = 1, limit = 20): Promise<{ notifications: Notification[]; hasMore: boolean }> {
    const userId = await this.requireUserId();
    const safeLimit = this.normaliseLimit(limit, 20);
    const pageNumber = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const offset = (pageNumber - 1) * safeLimit;

    try {
      const { data, error, count } = await this.client
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + safeLimit - 1);

      if (error) {
        throw error;
      }

      const total = count ?? 0;
      return {
        notifications: data ?? [],
        hasMore: total > offset + safeLimit,
      };
    } catch (error: unknown) {
      this.logger.error('Erreur lors du chargement paginé des notifications:', error as Error);
      throw new Error('Échec du chargement des notifications');
    }
  }
}

export const notificationService = new NotificationService();
