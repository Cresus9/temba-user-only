import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { mobileNotificationService, MobileNotification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export interface UseNotificationsReturn {
  unreadCount: number;
  notifications: MobileNotification[];
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const subscriptionRef = useRef<any>();

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setupNotifications();
    loadInitialData();

    return () => {
      cleanup();
    };
  }, [isAuthenticated]);

  const setupNotifications = async () => {
    // Configure push notifications
    await mobileNotificationService.configurePushNotifications();

    // Listen for notifications received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
      
      // Add to local state
      const notificationData = notification.request.content.data as any;
      if (notificationData?.notificationId) {
        refreshNotifications();
      }
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      mobileNotificationService.handleNotificationTap(
        { request: { content: { data } } },
        navigation
      );
    });

    // Subscribe to real-time notifications from Supabase
    subscriptionRef.current = mobileNotificationService.subscribeToNotifications((newNotification) => {
      console.log('🔔 Real-time notification received:', newNotification);
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for high priority notifications
      if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
        Alert.alert(
          newNotification.title,
          newNotification.message,
          [
            { text: 'Fermer', style: 'cancel' },
            ...(newNotification.action_url ? [{
              text: newNotification.action_text || 'Voir',
              onPress: () => mobileNotificationService.handleNotificationTap(
                { request: { content: { data: { actionUrl: newNotification.action_url } } } },
                navigation
              )
            }] : [])
          ]
        );
      }
    });
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      const [notificationsData, count] = await Promise.all([
        mobileNotificationService.getUserNotifications(20),
        mobileNotificationService.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(count);
      
    } catch (error) {
      console.error('Error loading initial notification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      const [notificationsData, count] = await Promise.all([
        mobileNotificationService.getUserNotifications(20),
        mobileNotificationService.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(count);
      
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await mobileNotificationService.markAsRead(id);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, read: 'true', read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await mobileNotificationService.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: 'true', read_at: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  const cleanup = () => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
    }
    
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
    }
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
  };

  return {
    unreadCount,
    notifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    isLoading
  };
}

// Hook for handling app state changes and notification updates
export function useNotificationAppState() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('📱 App has come to the foreground - updating badge count');
        mobileNotificationService.updateBadgeCount();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);
}
