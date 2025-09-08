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

  useEffect(() => {
    if (!isAuthenticated) return;

    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const subscription = notificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for high priority notifications
      if (newNotification.data?.priority === 'high' || newNotification.data?.priority === 'urgent') {
        toast.success(newNotification.title, {
          description: newNotification.message,
          duration: 5000,
          action: newNotification.data?.action_url ? {
            label: 'Voir',
            onClick: () => handleNotificationClick(newNotification)
          } : undefined,
        });
      } else {
        // Show a subtle notification for normal priority
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

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (notification.read === 'false') {
      handleMarkAsRead(notification.id);
    }

    // Close dropdown
    setIsOpen(false);

    // Handle deep linking based on notification type and data
    if (notification.action_url) {
      // Use action_url from the notification
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    } else if (notification.metadata?.action_url) {
      // Fallback to metadata action_url
      if (notification.metadata.action_url.startsWith('http')) {
        window.open(notification.metadata.action_url, '_blank');
      } else {
        navigate(notification.metadata.action_url);
      }
    } else if (notification.metadata?.order_id) {
      navigate(`/booking/confirmation/${notification.metadata.order_id}`);
    } else if (notification.metadata?.event_id) {
      navigate(`/events/${notification.metadata.event_id}`);
    } else if (notification.metadata?.ticket_id) {
      navigate(`/profile/tickets`);
    } else if (notification.type === 'SUPPORT_REPLY' && notification.metadata?.support_ticket_id) {
      navigate(`/support/${notification.metadata.support_ticket_id}`);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: 'true', read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: 'true', read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkNotificationsAsReadOnView = async () => {
    try {
      // Get unread notifications from current list
      const unreadNotifications = notifications.filter(n => n.read === 'false');
      
      if (unreadNotifications.length === 0) {
        console.log('No unread notifications to mark as read');
        return;
      }

      console.log(`🔄 Attempting to mark ${unreadNotifications.length} notifications as read on view`);
      console.log('Unread notification IDs:', unreadNotifications.map(n => n.id));

      // Mark each unread notification as read with detailed logging
      for (const notification of unreadNotifications) {
        try {
          console.log(`📝 Marking notification ${notification.id} as read...`);
          await notificationService.markAsRead(notification.id);
          console.log(`✅ Successfully marked ${notification.id} as read`);
        } catch (error) {
          console.error(`❌ Failed to mark ${notification.id} as read:`, error);
        }
      }

      // Update local state immediately
      setNotifications(prev => 
        prev.map(notif => 
          notif.read === 'false' 
            ? { ...notif, read: 'true', read_at: new Date().toISOString() }
            : notif
        )
      );
      
      console.log('🔄 Updated local notification state to read');
      
      // Refresh unread count from server
      try {
        const newCount = await notificationService.getNotificationCount();
        console.log(`📊 Server unread count after marking as read: ${newCount}`);
        setUnreadCount(newCount);
        
        if (newCount === 0) {
          console.log('✅ Badge should now be hidden');
        } else {
          console.log(`⚠️ Badge still showing - ${newCount} unread notifications remain`);
        }
      } catch (error) {
        console.error('❌ Error refreshing unread count:', error);
      }
      
    } catch (error) {
      console.error('❌ Error in handleMarkNotificationsAsReadOnView:', error);
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
          
          // Mark notifications as read when opening dropdown (with small delay)
          if (!wasOpen && notifications.length > 0) {
            console.log(`Bell clicked - opening dropdown. Unread count: ${unreadCount}, Total notifications: ${notifications.length}`);
            const unreadNotifs = notifications.filter(n => n.read === 'false');
            console.log(`Unread notifications to mark as read: ${unreadNotifs.length}`);
            
            setTimeout(() => {
              handleMarkNotificationsAsReadOnView();
            }, 1000); // 1 second delay to let user see the notifications
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
                      notification.read === 'false' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-white'
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
                            notification.read === 'false' ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                            {notification.read === 'false' && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </p>
                          {notification.read === 'false' && (
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
                        {(notification.action_url || notification.metadata?.action_url) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                          >
                            {notification.action_text || notification.metadata?.action_text || 'Voir plus'}
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