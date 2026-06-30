import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, MessageSquare, Ticket, Loader } from 'lucide-react';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
import { notificationService, Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const { isAuthenticated }               = useAuth();
  const navigate                          = useNavigate();
  const panelRef                          = useRef<HTMLDivElement>(null);

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

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey   = (e: KeyboardEvent)  => { if (e.key === 'Escape') setIsOpen(false); };
    const onClick = (e: MouseEvent)     => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: string) => {
    const base = 'w-4 h-4';
    switch (type) {
      case 'welcome':
        return <MessageSquare className={`${base} text-brand`} />;
      case 'event_reminder':
        return <Bell className={`${base} text-accent`} />;
      case 'ticket_purchased':
        return <Ticket className={`${base} text-emerald-600`} />;
      default:
        return <Bell className={`${base} text-ink-mute`} />;
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
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => {
          const wasOpen = isOpen;
          setIsOpen(o => !o);
          if (!wasOpen && notifications.length > 0) {
            setTimeout(handleMarkNotificationsAsReadOnView, 1000);
          }
        }}
        className="relative w-9 h-9 rounded-lg border border-line bg-paper grid place-items-center text-ink hover:text-brand hover:border-brand/30 hover:bg-brand-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center tabular-nums ring-2 ring-paper leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] bg-paper rounded-2xl border border-line shadow-pop z-50 overflow-hidden">

          {/* Header */}
          <div className="bg-cream border-b border-line px-4 py-3 flex items-center justify-between">
            <div>
              <h3
                className="text-[15px] font-bold text-ink"
                style={{ fontFamily: display }}
              >
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-semibold text-brand hover:text-brand/80 transition-colors mt-0.5"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader className="w-5 h-5 text-brand animate-spin" />
                <p className="text-[12px] text-ink-mute">Chargement…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cream border border-line grid place-items-center">
                  <Bell className="w-5 h-5 text-ink-mute" />
                </div>
                <p className="text-[13px] text-ink-mute">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {notifications.map(notif => {
                  const unread = notif.read === 'false';
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-4 py-3.5 cursor-pointer transition-colors hover:bg-cream ${
                        unread ? 'bg-brand-50 border-l-2 border-brand' : 'bg-paper'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon square */}
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 grid place-items-center mt-0.5 ${
                          unread ? 'bg-brand/10' : 'bg-cream border border-line'
                        }`}>
                          {getNotificationIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title + mark-read */}
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] leading-snug ${
                              unread ? 'font-bold text-ink' : 'font-semibold text-ink'
                            }`}>
                              {notif.title}
                              {unread && (
                                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-brand align-middle" />
                              )}
                            </p>
                            {unread && (
                              <button
                                onClick={e => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                className="text-[10px] font-semibold text-brand hover:text-brand/70 flex-shrink-0 transition-colors"
                              >
                                Lu
                              </button>
                            )}
                          </div>

                          {/* Message */}
                          <p className="text-[12px] text-ink-mute mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Time */}
                          <p
                            className="text-[10px] text-ink-mute/70 mt-1.5 tabular-nums"
                            style={{ fontFamily: mono }}
                          >
                            {formatTimeAgo(notif.created_at)}
                          </p>

                          {/* Action link */}
                          {(notif.action_url || notif.metadata?.action_url) && (
                            <button
                              onClick={e => { e.stopPropagation(); handleNotificationClick(notif); }}
                              className="text-[11px] font-semibold text-brand hover:text-brand/70 mt-1.5 transition-colors"
                            >
                              {notif.action_text || notif.metadata?.action_text || 'Explorer les événements'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-cream border-t border-line px-4 py-3">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-[13px] font-semibold text-brand hover:text-brand/70 transition-colors"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}