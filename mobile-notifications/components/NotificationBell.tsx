import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileNotificationService, MobileNotification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface NotificationBellProps {
  iconSize?: number;
  iconColor?: string;
}

export default function NotificationBell({ iconSize = 24, iconColor = '#374151' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated) return;

    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const subscription = mobileNotificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await mobileNotificationService.getUserNotifications(10);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await mobileNotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleBellPress = () => {
    if (!isAuthenticated) return;
    
    setIsModalVisible(true);
    
    // Mark notifications as read after a delay
    setTimeout(() => {
      handleMarkAsReadOnView();
    }, 1000);
  };

  const handleMarkAsReadOnView = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.read === 'false');
      
      if (unreadNotifications.length === 0) return;

      const markPromises = unreadNotifications.map(notification => 
        mobileNotificationService.markAsRead(notification.id)
      );

      await Promise.all(markPromises);

      setNotifications(prev => 
        prev.map(notif => 
          notif.read === 'false' 
            ? { ...notif, read: 'true', read_at: new Date().toISOString() }
            : notif
        )
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await mobileNotificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: 'true', read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
    }
  };

  const handleNotificationPress = (notification: MobileNotification) => {
    setIsModalVisible(false);
    
    // Mark as read if unread
    if (notification.read === 'false') {
      mobileNotificationService.markAsRead(notification.id);
    }
    
    // Handle deep linking
    mobileNotificationService.handleNotificationTap({ 
      request: { 
        content: { 
          data: { 
            actionUrl: notification.action_url,
            notificationId: notification.id 
          } 
        } 
      } 
    }, navigation);
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CONFIRMATION':
        return 'checkmark-circle';
      case 'EVENT_REMINDER':
        return 'time';
      case 'TICKET_TRANSFER':
        return 'swap-horizontal';
      case 'SUPPORT_REPLY':
        return 'chatbubble';
      case 'ACCOUNT_UPDATE':
        return 'person';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'normal':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return '#3B82F6';
    }
  };

  const renderNotificationItem = ({ item }: { item: MobileNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        item.read === 'false' && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color={getNotificationColor(item.priority)}
            style={styles.notificationIcon}
          />
          <Text style={[
            styles.notificationTitle,
            item.read === 'false' && styles.unreadText
          ]}>
            {item.title}
          </Text>
          {item.read === 'false' && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>
            {formatTimeAgo(item.created_at)}
          </Text>
          {item.action_text && (
            <Text style={styles.actionText}>
              {item.action_text}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) return null;

  return (
    <>
      <TouchableOpacity onPress={handleBellPress} style={styles.bellContainer}>
        <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.headerButtons}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                  <Text style={styles.markAllText}>Tout marquer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Aucune notification</Text>
                <Text style={styles.emptySubtext}>
                  Vous recevrez ici vos notifications importantes
                </Text>
              </View>
            }
            contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          />

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                navigation.navigate('Notifications' as never);
              }}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>Voir toutes les notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    marginRight: 16,
  },
  markAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadNotification: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  unreadText: {
    color: '#111827',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewAllButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
