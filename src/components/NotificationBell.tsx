import React, { useState, useEffect } from 'react';
import { Bell, X, Check, MessageSquare, ExternalLink } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getMetadataString = (metadata: Notification['metadata'], key: string): string | undefined => {
    if (!metadata) {
      return undefined;
    }
    const value = metadata[key];
    return typeof value === 'string' ? value : undefined;
  };

  const getMetadataId = (metadata: Notification['metadata'], key: string): string | undefined => {
    if (!metadata) {
      return undefined;
    }
    const value = metadata[key];
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return undefined;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const subscription = notificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => {
        const existingIndex = prev.findIndex(notification => notification.id === newNotification.id);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = newNotification;
          return next;
        }
        return [newNotification, ...prev.slice(0, 9)];
      });
      if (!newNotification.read) {
        setUnreadCount(prev => prev + 1);
      }

      const highPriority = newNotification.priority === 'high' || newNotification.priority === 'urgent';
      const actionUrl = newNotification.action_url ?? getMetadataString(newNotification.metadata, 'action_url');
      if (highPriority) {
        toast.success(newNotification.title, {
          description: newNotification.message,
          duration: 5000,
          action: actionUrl
            ? {
                label: 'Voir',
                onClick: () => handleNotificationClick(newNotification),
              }
            : undefined,
        });
      } else {
        toast(newNotification.title, {
          icon: '🔔',
          duration: 3000,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications(10);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const openActionUrl = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener');
    } else {
      navigate(url);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Close dropdown
    setIsOpen(false);

    // Handle deep linking based on notification type and data
    if (notification.action_url) {
      openActionUrl(notification.action_url);
      return;
    }

    const metadataActionUrl = getMetadataString(notification.metadata, 'action_url');
    if (metadataActionUrl) {
      openActionUrl(metadataActionUrl);
      return;
    }

    const orderId = getMetadataId(notification.metadata, 'order_id');
    if (orderId) {
      navigate(`/booking/confirmation/${orderId}`);
      return;
    }

    const eventId = getMetadataId(notification.metadata, 'event_id');
    if (eventId) {
      navigate(`/events/${eventId}`);
      return;
    }

    const ticketId = getMetadataId(notification.metadata, 'ticket_id');
    if (ticketId) {
      navigate(`/profile/tickets`);
      return;
    }

    if (notification.type === 'SUPPORT_REPLY') {
      const supportTicketId = getMetadataId(notification.metadata, 'support_ticket_id');
      if (supportTicketId) {
        navigate(`/support/${supportTicketId}`);
      }
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const wasUnread = notifications.some(notification => notification.id === notificationId && !notification.read);
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true, read_at: notif.read_at ?? new Date().toISOString() }
            : notif
        )
      );
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        void loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true, read_at: notif.read_at ?? now }))
      );
      setUnreadCount(0);
      void loadUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkNotificationsAsReadOnView = async () => {
    try {
      // Get unread notifications from current list
      const unreadNotifications = notifications.filter(n => !n.read);

      if (unreadNotifications.length === 0) {
        return;
      }

      await Promise.allSettled(unreadNotifications.map(notification => notificationService.markAsRead(notification.id)));

      setNotifications(prev =>
        prev.map(notif =>
          notif.read
            ? notif
            : { ...notif, read: true, read_at: notif.read_at ?? new Date().toISOString() }
        )
      );

      void loadUnreadCount();
    } catch (error) {
      console.error('Error in handleMarkNotificationsAsReadOnView:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'event_reminder':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'ticket_purchased':
        return <Check className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          const wasOpen = isOpen;
          setIsOpen(!isOpen);

          if (!wasOpen && notifications.some(notification => !notification.read)) {
            setTimeout(() => {
              void handleMarkNotificationsAsReadOnView();
            }, 1000);
          }
        }}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-indigo-600 hover:text-indigo-700 mt-2"
              >
                Marquer tout comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-all duration-300 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-white'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                        {(notification.action_url || getMetadataString(notification.metadata, 'action_url')) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                          >
                            {notification.action_text || getMetadataString(notification.metadata, 'action_text') || 'Voir plus'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with View All link */}
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 
