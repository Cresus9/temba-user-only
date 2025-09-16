import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase-client';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_RETRIES = 3;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryAttempts = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isMountedRef = useRef(true);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setError(null);
    setLoading(true);
    let shouldResetLoading = true;

    try {
      const data = await notificationService.getUserNotifications(50);
      if (!isMountedRef.current) {
        return;
      }
      setNotifications(data);
      retryAttempts.current = 0;
      clearRetryTimeout();
    } catch (err) {
      const errorObject = err as Error;

      if (errorObject?.message === 'Non authentifié') {
        if (isMountedRef.current) {
          setNotifications([]);
          setLoading(false);
        }
        shouldResetLoading = false;
        return;
      }

      if (errorObject?.message?.includes('Failed to fetch') && retryAttempts.current < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, retryAttempts.current);
        retryAttempts.current += 1;
        clearRetryTimeout();
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            void fetchNotifications();
          }
        }, delay);
        shouldResetLoading = false;
        return;
      }

      if (isMountedRef.current) {
        setError('Failed to load notifications');
        toast.error('Failed to load notifications', {
          id: 'notifications-error',
          duration: 4000,
          icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
        });
      }
    } finally {
      if (shouldResetLoading && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const attachSubscription = () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = notificationService.subscribeToNotifications((notification) => {
        if (!isMountedRef.current) {
          return;
        }
        setNotifications((prev) => {
          const index = prev.findIndex((item) => item.id === notification.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = notification;
            return next;
          }
          return [notification, ...prev];
        });
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        retryAttempts.current = 0;
        clearRetryTimeout();
        void fetchNotifications();
        attachSubscription();
      } else if (event === 'SIGNED_OUT') {
        clearRetryTimeout();
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = null;
        if (isMountedRef.current) {
          setNotifications([]);
          setLoading(false);
        }
      }
    });

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          retryAttempts.current = 0;
          clearRetryTimeout();
          await fetchNotifications();
          attachSubscription();
        } else if (isMountedRef.current) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing notifications:', err);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      clearRetryTimeout();
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const updated = await notificationService.markAsRead(id);
      if (!updated || !isMountedRef.current) {
        return;
      }

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? {
                ...notif,
                read: true,
                read_at: notif.read_at ?? new Date().toISOString(),
              }
            : notif,
        ),
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read', {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      if (!isMountedRef.current) {
        return;
      }
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.read
            ? notif
            : {
                ...notif,
                read: true,
                read_at: notif.read_at ?? now,
              },
        ),
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read', {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      if (!isMountedRef.current) {
        return;
      }
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification', {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  }, []);

  const unreadCount = notifications.reduce((count, notif) => (notif.read ? count : count + 1), 0);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
