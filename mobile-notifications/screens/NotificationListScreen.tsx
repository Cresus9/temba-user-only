import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileNotificationService, MobileNotification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

type FilterType = 'all' | 'unread' | 'read';
type SortType = 'newest' | 'oldest';

const NOTIFICATION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ORDER_CONFIRMATION: { label: 'Confirmation de commande', color: '#10B981' },
  EVENT_REMINDER: { label: 'Rappel d\'événement', color: '#3B82F6' },
  TICKET_TRANSFER: { label: 'Transfert de billet', color: '#8B5CF6' },
  SUPPORT_REPLY: { label: 'Réponse support', color: '#F59E0B' },
  ACCOUNT_UPDATE: { label: 'Mise à jour compte', color: '#6B7280' },
  SYSTEM: { label: 'Système', color: '#4F46E5' },
};

export default function NotificationListScreen() {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications(true);
    
    // Subscribe to real-time notifications
    const subscription = mobileNotificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [notifications, filter, sort, searchTerm]);

  const loadNotifications = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const data = await mobileNotificationService.getUserNotifications(
        ITEMS_PER_PAGE, 
        (currentPage - 1) * ITEMS_PER_PAGE
      );

      if (reset) {
        setNotifications(data);
      } else {
        setNotifications(prev => [...prev, ...data]);
      }

      setHasMore(data.length === ITEMS_PER_PAGE);
      if (!reset) setPage(prev => prev + 1);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadNotifications(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => n.read === 'false');
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read === 'true');
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredNotifications(filtered);
  };

  const handleNotificationPress = (notification: MobileNotification) => {
    // Mark as read if unread
    if (notification.read === 'false') {
      handleMarkAsRead(notification.id);
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await mobileNotificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read: 'true', read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await mobileNotificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: 'true', read_at: new Date().toISOString() }))
      );
      Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const promises = Array.from(selectedIds).map(id => 
        mobileNotificationService.markAsRead(id)
      );
      await Promise.all(promises);

      setNotifications(prev =>
        prev.map(n =>
          selectedIds.has(n.id)
            ? { ...n, read: 'true', read_at: new Date().toISOString() }
            : n
        )
      );

      setSelectedIds(new Set());
      Alert.alert('Succès', `${selectedIds.size} notifications marquées comme lues`);
    } catch (error) {
      console.error('Error bulk marking as read:', error);
      Alert.alert('Erreur', 'Impossible de marquer les notifications sélectionnées');
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

  const renderNotificationItem = ({ item }: { item: MobileNotification }) => {
    const typeInfo = NOTIFICATION_TYPE_LABELS[item.type] || NOTIFICATION_TYPE_LABELS.SYSTEM;
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.read === 'false' && styles.unreadNotification,
          selectedIds.has(item.id) && styles.selectedNotification
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => toggleSelection(item.id)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <TouchableOpacity
              onPress={() => toggleSelection(item.id)}
              style={styles.checkbox}
            >
              <Ionicons
                name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                size={20}
                color={selectedIds.has(item.id) ? '#3B82F6' : '#9CA3AF'}
              />
            </TouchableOpacity>
            
            <View style={[styles.typeIndicator, { backgroundColor: typeInfo.color }]} />
            
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={20}
              color={typeInfo.color}
              style={styles.notificationIcon}
            />
            
            <Text style={[
              styles.notificationTitle,
              item.read === 'false' && styles.unreadText
            ]} numberOfLines={1}>
              {item.title}
            </Text>
            
            {item.read === 'false' && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <View style={styles.notificationFooter}>
            <View style={[styles.typeChip, { backgroundColor: typeInfo.color + '20' }]}>
              <Text style={[styles.typeChipText, { color: typeInfo.color }]}>
                {typeInfo.label}
              </Text>
            </View>
            
            <Text style={styles.notificationTime}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
        
        {item.read === 'false' && (
          <TouchableOpacity
            onPress={() => handleMarkAsRead(item.id)}
            style={styles.markReadButton}
          >
            <Ionicons name="checkmark" size={16} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => n.read === 'false').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.filterButton}
        >
          <Ionicons name="filter" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher dans les notifications..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <View style={styles.bulkActions}>
          <Text style={styles.bulkActionsText}>
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity onPress={handleBulkMarkAsRead} style={styles.bulkActionButton}>
              <Text style={styles.bulkActionButtonText}>Marquer comme lues</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelection} style={styles.bulkActionButton}>
              <Text style={[styles.bulkActionButtonText, styles.cancelText]}>Désélectionner</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'Aucune notification trouvée' : 'Aucune notification'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchTerm 
                ? 'Essayez avec d\'autres mots-clés'
                : 'Vous recevrez ici vos notifications importantes'
              }
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Chargement...</Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filtres et tri</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Filtrer par statut</Text>
            {(['all', 'unread', 'read'] as FilterType[]).map((filterType) => (
              <TouchableOpacity
                key={filterType}
                style={styles.filterOption}
                onPress={() => setFilter(filterType)}
              >
                <Text style={styles.filterOptionText}>
                  {filterType === 'all' ? 'Toutes' : 
                   filterType === 'unread' ? 'Non lues' : 'Lues'}
                </Text>
                <Ionicons
                  name={filter === filterType ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={filter === filterType ? '#3B82F6' : '#9CA3AF'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Trier par date</Text>
            {(['newest', 'oldest'] as SortType[]).map((sortType) => (
              <TouchableOpacity
                key={sortType}
                style={styles.filterOption}
                onPress={() => setSort(sortType)}
              >
                <Text style={styles.filterOptionText}>
                  {sortType === 'newest' ? 'Plus récentes' : 'Plus anciennes'}
                </Text>
                <Ionicons
                  name={sort === sortType ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={sort === sortType ? '#3B82F6' : '#9CA3AF'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterSection}>
            <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>Sélectionner tout ({filteredNotifications.length})</Text>
            </TouchableOpacity>
            
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllReadButton}>
                <Text style={styles.markAllReadText}>Marquer tout comme lu</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  bulkActions: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionsText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionButton: {
    paddingHorizontal: 8,
  },
  bulkActionButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  cancelText: {
    color: '#6B7280',
  },
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unreadNotification: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  selectedNotification: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  typeIndicator: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
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
    marginBottom: 12,
    marginLeft: 28,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 28,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  markReadButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#6B7280',
    fontSize: 14,
  },
  filterModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectAllButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  markAllReadButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllReadText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});
