import { z } from 'zod';
import { supabase } from '../lib/supabase-client';
import {
  NotificationPriority,
  coerceToBoolean,
  parsePriority,
  sanitizeActionText,
  sanitizeActionUrl,
  sanitizeMessage,
  sanitizeMetadata,
  sanitizePreferenceTypes,
  sanitizeText,
  sanitizeTitle,
} from '../utils/notificationSanitizers';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string | null;
  priority: NotificationPriority;
  action_url?: string | null;
  action_text?: string | null;
  expires_at?: string | null;
  category_id?: string | null;
  template_id?: string | null;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  types: string[];
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const NOTIFICATIONS_TABLE = 'notifications';
const PREFERENCES_TABLE = 'notification_preferences';

const notificationRowSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    metadata: z.unknown().optional().nullable(),
    read: z.union([z.boolean(), z.string(), z.number(), z.null()]).optional(),
    read_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable().optional(),
    category_id: z.string().nullable().optional(),
    template_id: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    action_url: z.string().nullable().optional(),
    action_text: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
  })
  .passthrough();

const preferencesRowSchema = z
  .object({
    email: z.union([z.boolean(), z.string(), z.null()]).optional(),
    push: z.union([z.boolean(), z.string(), z.null()]).optional(),
    types: z.array(z.string()).optional(),
  })
  .partial();

const ensureAuthenticatedUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  const user = data?.user;
  if (!user) {
    throw new Error('Non authentifié');
  }
  return user;
};

const clampLimit = (limit?: number) => {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
};

const normalizeNotificationRow = (row: unknown): Notification | null => {
  const parsed = notificationRowSchema.safeParse(row);
  if (!parsed.success) {
    console.error('Invalid notification row received', parsed.error);
    return null;
  }

  const data = parsed.data;
  const sanitizedType = sanitizeText(data.type, 'SYSTEM', 64);
  const title = sanitizeTitle(data.title);
  const message = sanitizeMessage(data.message, title);
  const metadata = sanitizeMetadata(data.metadata);
  const actionUrl = sanitizeActionUrl(data.action_url);
  const actionText = sanitizeActionText(data.action_text);

  if (metadata) {
    if (actionUrl && typeof metadata.action_url !== 'string') {
      metadata.action_url = actionUrl;
    }
    if (actionText && typeof metadata.action_text !== 'string') {
      metadata.action_text = actionText;
    }
  }

  const prioritySource = data.priority ?? (metadata?.priority as string | undefined);
  const priority = parsePriority(prioritySource);

  return {
    id: data.id,
    user_id: data.user_id,
    type: sanitizedType,
    title,
    message,
    metadata,
    read: coerceToBoolean(data.read),
    read_at: data.read_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at ?? null,
    priority,
    action_url: actionUrl,
    action_text: actionText,
    expires_at: data.expires_at ?? null,
    category_id: data.category_id ?? null,
    template_id: data.template_id ?? null,
  };
};

const normalizePreferencesRow = (row: unknown): NotificationPreferences => {
  const parsed = preferencesRowSchema.safeParse(row);
  if (!parsed.success) {
    return { email: true, push: false, types: [] };
  }

  const { email, push, types } = parsed.data;
  return {
    email: email !== undefined ? coerceToBoolean(email) : true,
    push: push !== undefined ? coerceToBoolean(push) : false,
    types: sanitizePreferenceTypes(types),
  };
};

const sanitizeNotificationId = (notificationId: string) => {
  const trimmed = notificationId.trim();
  if (!trimmed) {
    throw new Error('Invalid notification identifier');
  }
  return trimmed;
};

class NotificationService {
  async getUserNotifications(limit = DEFAULT_LIMIT): Promise<Notification[]> {
    const user = await ensureAuthenticatedUser();
    const safeLimit = clampLimit(limit);

    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map(normalizeNotificationRow)
      .filter((notification): notification is Notification => Boolean(notification));
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const user = await ensureAuthenticatedUser();

    const { data, error } = await supabase
      .from(PREFERENCES_TABLE)
      .select('email, push, types')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return { email: true, push: false, types: [] };
      }
      throw error;
    }

    return normalizePreferencesRow(data);
  }

  async updatePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
    const user = await ensureAuthenticatedUser();

    const sanitizedTypes = sanitizePreferenceTypes(prefs.types);
    const payload = {
      user_id: user.id,
      email: Boolean(prefs.email),
      push: Boolean(prefs.push),
      types: sanitizedTypes,
    };

    const { data, error } = await supabase
      .from(PREFERENCES_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select('email, push, types')
      .single();

    if (error) {
      throw error;
    }

    return normalizePreferencesRow(data);
  }

  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    const result = await window.Notification.requestPermission();
    return result === 'granted';
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const user = await ensureAuthenticatedUser();

    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*')
      .eq('user_id', user.id)
      .eq('read', 'false')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map(normalizeNotificationRow)
      .filter((notification): notification is Notification => Boolean(notification));
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const user = await ensureAuthenticatedUser();
    const sanitizedId = sanitizeNotificationId(notificationId);

    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({
        read: 'true',
        read_at: new Date().toISOString(),
      })
      .eq('id', sanitizedId)
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      throw error;
    }

    const updatedCount = Array.isArray(data) ? data.length : data ? 1 : 0;
    return updatedCount > 0;
  }

  async markAllAsRead(): Promise<void> {
    const user = await ensureAuthenticatedUser();

    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({
        read: 'true',
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('read', 'false');

    if (error) {
      throw error;
    }
  }

  async getNotificationCount(): Promise<number> {
    const user = await ensureAuthenticatedUser();

    const { count, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', 'false');

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  subscribeToNotifications(callback: (notification: Notification) => void) {
    const setupSubscription = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }

        const user = data?.user;
        if (!user) {
          return null;
        }

        const channel = supabase
          .channel(`notifications-${user.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: NOTIFICATIONS_TABLE,
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const normalized = normalizeNotificationRow(payload.new);
              if (normalized) {
                callback(normalized);
              }
            },
          )
          .subscribe((status, err) => {
            if (err) {
              console.error('Notification subscription error', err);
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Notification channel issue', status);
            }
          });

        return channel;
      } catch (error) {
        console.error('Error setting up notifications subscription:', error);
        return null;
      }
    };

    const channelPromise = setupSubscription();

    return {
      unsubscribe: () => {
        channelPromise
          .then((channel) => {
            if (channel) {
              supabase.removeChannel(channel);
            }
          })
          .catch((error) => {
            console.error('Error tearing down notifications subscription:', error);
          });
      },
    };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const user = await ensureAuthenticatedUser();
    const sanitizedId = sanitizeNotificationId(notificationId);

    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .delete()
      .eq('id', sanitizedId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  async getNotifications(page = 1, limit = DEFAULT_LIMIT): Promise<{ notifications: Notification[]; hasMore: boolean }> {
    const user = await ensureAuthenticatedUser();
    const safeLimit = clampLimit(limit);
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const offset = (safePage - 1) * safeLimit;

    const { data, error, count } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      throw error;
    }

    const notifications = (data ?? [])
      .map(normalizeNotificationRow)
      .filter((notification): notification is Notification => Boolean(notification));

    return {
      notifications,
      hasMore: (count ?? 0) > offset + safeLimit,
    };
  }
}

export const notificationService = new NotificationService();
