import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Check, CheckCheck, Filter, Search, Calendar, Tag } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'unread' | 'read';
type SortType = 'newest' | 'oldest';

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  ORDER_CONFIRMATION: { label: 'Confirmation de commande', color: 'bg-green-100 text-green-800', icon: Check },
  EVENT_REMINDER: { label: 'Rappel d\'événement', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  TICKET_TRANSFER: { label: 'Transfert de billet', color: 'bg-purple-100 text-purple-800', icon: Tag },
  SUPPORT_REPLY: { label: 'Réponse support', color: 'bg-orange-100 text-orange-800', icon: Bell },
  ACCOUNT_UPDATE: { label: 'Mise à jour compte', color: 'bg-gray-100 text-gray-800', icon: Bell },
  SYSTEM: { label: 'Système', color: 'bg-indigo-100 text-indigo-800', icon: Bell },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications(true);
  }, [isAuthenticated, filter, sort]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to real-time notifications
    const subscription = notificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  const loadNotifications = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      let data = await notificationService.getUserNotifications(ITEMS_PER_PAGE * currentPage);
      
      // Apply filters
      if (filter === 'unread') {
        data = data.filter(n => !n.read_at);
      } else if (filter === 'read') {
        data = data.filter(n => n.read_at);
      }

      // Apply search
      if (searchTerm) {
        data = data.filter(n => 
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply sort
      data.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sort === 'newest' ? dateB - dateA : dateA - dateB;
      });

      if (reset) {
        setNotifications(data);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...data.slice(prev.length)]);
      }

      setHasMore(data.length >= ITEMS_PER_PAGE * currentPage);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (processingIds.has(notificationId)) return;

    try {
      setProcessingIds(prev => new Set([...prev, notificationId]));
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Erreur lors du marquage comme lu');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors du marquage de toutes les notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      setLoading(true);
      const promises = Array.from(selectedIds).map(id => notificationService.markAsRead(id));
      await Promise.all(promises);
      
      setNotifications(prev =>
        prev.map(n =>
          selectedIds.has(n.id)
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} notifications marquées comme lues`);
    } catch (error) {
      console.error('Error bulk marking as read:', error);
      toast.error('Erreur lors du marquage en lot');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const visibleIds = filteredNotifications.map(n => n.id);
    setSelectedIds(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }

    // Handle deep linking based on notification type and data
    if (notification.data?.action_url) {
      window.location.href = notification.data.action_url;
    } else if (notification.data?.order_id) {
      window.location.href = `/booking/confirmation/${notification.data.order_id}`;
    } else if (notification.data?.event_id) {
      window.location.href = `/events/${notification.data.event_id}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read_at) return false;
    if (filter === 'read' && !notification.read_at) return false;
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600 mb-4">Connectez-vous pour voir vos notifications</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher dans les notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Toutes</option>
                <option value="unread">Non lues</option>
                <option value="read">Lues</option>
              </select>
              
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="newest">Plus récentes</option>
                <option value="oldest">Plus anciennes</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-md flex items-center justify-between">
              <span className="text-sm text-indigo-700">
                {selectedIds.size} notification{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Marquer comme lues
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Désélectionner
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucune notification trouvée' : 'Aucune notification'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Essayez avec d\'autres mots-clés'
                  : 'Vous recevrez ici vos notifications importantes'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Select All */}
              <div className="p-4 bg-gray-50 border-b">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredNotifications.length) {
                        clearSelection();
                      } else {
                        selectAll();
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Sélectionner tout ({filteredNotifications.length})
                  </span>
                </label>
              </div>

              {filteredNotifications.map((notification) => {
                const typeInfo = NOTIFICATION_TYPE_LABELS[notification.type] || NOTIFICATION_TYPE_LABELS.SYSTEM;
                const IconComponent = typeInfo.icon;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read_at ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full ${typeInfo.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`text-sm font-medium ${!notification.read_at ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h4>
                              {!notification.read_at && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded-full ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span>{formatTimeAgo(notification.created_at)}</span>
                            </div>
                          </div>
                          
                          {!notification.read_at && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={processingIds.has(notification.id)}
                              className="ml-2 p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
                              title="Marquer comme lu"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMore && filteredNotifications.length > 0 && (
            <div className="p-4 text-center border-t">
              <button
                onClick={loadMore}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Chargement...
                  </>
                ) : (
                  'Charger plus'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
