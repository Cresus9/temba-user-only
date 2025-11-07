# Mobile Transfer Displays - UI Components

## 📱 Overview

This document shows how "already transferred" tickets and "received tickets" should be presented in the mobile app, with complete UI components and user experience flows.

## 🎫 Already Transferred Tickets Display

### 1. Sent Tickets List Component

```typescript
// src/components/SentTicketsList.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loadSentTickets } from '../store/slices/ticketSlice';

interface SentTicket {
  id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  ticket_type_id: string;
  status: string;
  transferred_to: {
    name: string;
    email: string;
  };
  transferred_at: string;
  transfer_status: 'COMPLETED' | 'PENDING';
}

export const SentTicketsList: React.FC = () => {
  const dispatch = useDispatch();
  const { sentTickets, loading } = useSelector((state: RootState) => state.tickets);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(loadSentTickets());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadSentTickets());
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#4CAF50';
      case 'PENDING': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Transféré';
      case 'PENDING': return 'En attente';
      default: return 'Inconnu';
    }
  };

  const renderSentTicket = ({ item }: { item: SentTicket }) => (
    <View style={styles.sentTicketCard}>
      {/* Header with status */}
      <View style={styles.ticketHeader}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.transfer_status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.transfer_status)}</Text>
          </View>
          <Text style={styles.transferDate}>
            {formatDate(item.transferred_at)}
          </Text>
        </View>
      </View>

      {/* Event details */}
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.event_title}</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventInfoText}>📅 {item.event_date}</Text>
          <Text style={styles.eventInfoText}>📍 {item.event_venue}</Text>
        </View>
        <Text style={styles.ticketType}>Type: {item.ticket_type_id}</Text>
      </View>

      {/* Transfer details */}
      <View style={styles.transferDetails}>
        <View style={styles.transferInfo}>
          <Text style={styles.transferLabel}>Transféré à:</Text>
          <Text style={styles.recipientName}>{item.transferred_to.name}</Text>
          <Text style={styles.recipientEmail}>{item.transferred_to.email}</Text>
        </View>
        
        <View style={styles.transferActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Détails', `Billet transféré le ${formatDate(item.transferred_at)}`)}
          >
            <Text style={styles.actionButtonText}>Détails</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Blurred ticket preview */}
      <View style={styles.blurredPreview}>
        <View style={styles.blurredContent}>
          <Text style={styles.blurredText}>🎫</Text>
          <Text style={styles.blurredTitle}>Billet transféré</Text>
          <Text style={styles.blurredSubtitle}>Vous n'avez plus accès à ce billet</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des billets transférés...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Billets Transférés</Text>
        <Text style={styles.subtitle}>
          {sentTickets.length} billet{sentTickets.length !== 1 ? 's' : ''} transféré{sentTickets.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {sentTickets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📤</Text>
          <Text style={styles.emptyTitle}>Aucun billet transféré</Text>
          <Text style={styles.emptySubtitle}>
            Les billets que vous transférez apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={sentTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderSentTicket}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  sentTicketCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  transferDate: {
    fontSize: 14,
    color: '#666',
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  eventInfo: {
    marginBottom: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  transferDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  transferInfo: {
    flex: 1,
  },
  transferLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  recipientEmail: {
    fontSize: 14,
    color: '#666',
  },
  transferActions: {
    marginLeft: 16,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  blurredPreview: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    opacity: 0.6,
  },
  blurredContent: {
    alignItems: 'center',
  },
  blurredText: {
    fontSize: 32,
    marginBottom: 8,
  },
  blurredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  blurredSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
```

### 2. Sent Tickets Screen

```typescript
// src/screens/SentTicketsScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SentTicketsList } from '../components/SentTicketsList';

export const SentTicketsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <SentTicketsList />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
```

## 🎁 Received Tickets Display

### 1. Received Tickets List Component

```typescript
// src/components/ReceivedTicketsList.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loadTransferredTickets } from '../store/slices/ticketSlice';
import { EnhancedFestivalTicket } from './EnhancedFestivalTicket';

interface ReceivedTicket {
  id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  ticket_type_id: string;
  status: 'VALID' | 'USED';
  qr_code: string;
  transferred_from: {
    name: string;
    email: string;
  };
  transferred_at: string;
  scanned_at?: string;
}

export const ReceivedTicketsList: React.FC = () => {
  const dispatch = useDispatch();
  const { transferredTickets, loading } = useSelector((state: RootState) => state.tickets);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ReceivedTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    dispatch(loadTransferredTickets());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadTransferredTickets());
    setRefreshing(false);
  };

  const handleTicketPress = (ticket: ReceivedTicket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return '#4CAF50';
      case 'USED': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VALID': return 'Valide';
      case 'USED': return 'Utilisé';
      default: return 'Inconnu';
    }
  };

  const renderReceivedTicket = ({ item }: { item: ReceivedTicket }) => (
    <TouchableOpacity
      style={styles.receivedTicketCard}
      onPress={() => handleTicketPress(item)}
      activeOpacity={0.7}
    >
      {/* Header with status */}
      <View style={styles.ticketHeader}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <Text style={styles.receivedDate}>
            Reçu le {formatDate(item.transferred_at)}
          </Text>
        </View>
      </View>

      {/* Event details */}
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.event_title}</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventInfoText}>📅 {item.event_date}</Text>
          <Text style={styles.eventInfoText}>📍 {item.event_venue}</Text>
        </View>
        <Text style={styles.ticketType}>Type: {item.ticket_type_id}</Text>
      </View>

      {/* Transfer details */}
      <View style={styles.transferDetails}>
        <View style={styles.transferInfo}>
          <Text style={styles.transferLabel}>Reçu de:</Text>
          <Text style={styles.senderName}>{item.transferred_from.name}</Text>
          <Text style={styles.senderEmail}>{item.transferred_from.email}</Text>
        </View>
        
        <View style={styles.ticketActions}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>Voir le billet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scan status */}
      {item.status === 'USED' && item.scanned_at && (
        <View style={styles.scanStatus}>
          <Text style={styles.scanStatusText}>
            ✅ Scanné le {formatDate(item.scanned_at)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des billets reçus...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Billets Reçus</Text>
        <Text style={styles.subtitle}>
          {transferredTickets.length} billet{transferredTickets.length !== 1 ? 's' : ''} reçu{transferredTickets.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {transferredTickets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>Aucun billet reçu</Text>
          <Text style={styles.emptySubtitle}>
            Les billets qui vous sont transférés apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={transferredTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderReceivedTicket}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        />
      )}

      {/* Ticket Detail Modal */}
      <Modal
        visible={showTicketModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du billet</Text>
            <TouchableOpacity
              onPress={() => setShowTicketModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedTicket && (
            <View style={styles.modalContent}>
              <EnhancedFestivalTicket
                ticket={selectedTicket}
                showTransferButton={false}
                showScanStatus={true}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  receivedTicketCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  receivedDate: {
    fontSize: 14,
    color: '#666',
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  eventInfo: {
    marginBottom: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  transferDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  transferInfo: {
    flex: 1,
  },
  transferLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  senderEmail: {
    fontSize: 14,
    color: '#666',
  },
  ticketActions: {
    marginLeft: 16,
  },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  scanStatus: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  scanStatusText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
});
```

### 2. Enhanced Festival Ticket Component (Mobile Version)

```typescript
// src/components/EnhancedFestivalTicket.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface Ticket {
  id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  ticket_type_id: string;
  status: 'VALID' | 'USED';
  qr_code: string;
  scanned_at?: string;
  transferred_from?: {
    name: string;
    email: string;
  };
}

interface EnhancedFestivalTicketProps {
  ticket: Ticket;
  showTransferButton?: boolean;
  showScanStatus?: boolean;
}

const { width } = Dimensions.get('window');

export const EnhancedFestivalTicket: React.FC<EnhancedFestivalTicketProps> = ({
  ticket,
  showTransferButton = true,
  showScanStatus = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return '#4CAF50';
      case 'USED': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VALID': return 'Billet Valide';
      case 'USED': return 'Billet Utilisé';
      default: return 'Statut Inconnu';
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(ticket.status) }]}>
        <Text style={styles.statusText}>{getStatusText(ticket.status)}</Text>
        {showScanStatus && ticket.status === 'USED' && ticket.scanned_at && (
          <Text style={styles.scanDate}>
            Scanné le {formatDate(ticket.scanned_at)}
          </Text>
        )}
      </View>

      {/* Ticket Content */}
      <View style={styles.ticketContent}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{ticket.event_title}</Text>
          <View style={styles.eventDetails}>
            <Text style={styles.eventDate}>📅 {formatDate(ticket.event_date)}</Text>
            <Text style={styles.eventVenue}>📍 {ticket.event_venue}</Text>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <QRCode
              value={ticket.qr_code}
              size={width * 0.4}
              color="#000"
              backgroundColor="#fff"
            />
          </View>
          <Text style={styles.qrLabel}>Code QR du billet</Text>
        </View>

        {/* Ticket Info */}
        <View style={styles.ticketInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type de billet:</Text>
            <Text style={styles.infoValue}>{ticket.ticket_type_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID du billet:</Text>
            <Text style={styles.infoValue}>{ticket.id.slice(0, 8)}...</Text>
          </View>
          {ticket.transferred_from && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reçu de:</Text>
              <Text style={styles.infoValue}>{ticket.transferred_from.name}</Text>
            </View>
          )}
        </View>

        {/* Transfer Button (if applicable) */}
        {showTransferButton && ticket.status === 'VALID' && (
          <View style={styles.transferSection}>
            <TouchableOpacity style={styles.transferButton}>
              <Text style={styles.transferButtonText}>Transférer ce billet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanDate: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  ticketContent: {
    padding: 20,
  },
  eventHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  eventDetails: {
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 16,
    color: '#666',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  ticketInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  transferSection: {
    marginTop: 8,
  },
  transferButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  transferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## 🎨 Visual Design Principles

### Already Transferred Tickets
- **Blurred Preview**: Shows ticket exists but user can't access details
- **Status Indicators**: Clear visual status (Transféré, En attente)
- **Transfer Details**: Who it was transferred to and when
- **Limited Actions**: Only view details, no transfer or scan options

### Received Tickets
- **Full Access**: Complete ticket details and QR code
- **Transfer History**: Shows who sent the ticket and when
- **Scan Status**: Clear indication if ticket has been used
- **Full Functionality**: Can view, scan, and potentially transfer again

## 🔄 Navigation Integration

### Tab Navigation Update
```typescript
// src/navigation/AppNavigator.tsx
const MainTabs = () => (
  <Tab.Navigator>
    <Tab.Screen 
      name="MyTickets" 
      component={TicketsScreen}
      options={{ title: 'Mes Billets' }}
    />
    <Tab.Screen 
      name="Received" 
      component={ReceivedTicketsScreen}
      options={{ title: 'Reçus' }}
    />
    <Tab.Screen 
      name="Sent" 
      component={SentTicketsScreen}
      options={{ title: 'Transférés' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profil' }}
    />
  </Tab.Navigator>
);
```

## 📊 State Management Updates

### Redux Slice Updates
```typescript
// src/store/slices/ticketSlice.ts
export const loadSentTickets = createAsyncThunk(
  'tickets/loadSentTickets',
  async () => {
    const { data, error } = await supabase
      .from('ticket_transfers')
      .select(`
        id,
        ticket_id,
        recipient_email,
        recipient_name,
        status,
        created_at,
        ticket:tickets (
          id,
          event_id,
          ticket_type_id,
          status,
          event:events (
            title,
            date,
            venue
          )
        )
      `)
      .eq('sender_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
);
```

This implementation provides a complete, user-friendly way to display both transferred and received tickets in the mobile app, with clear visual distinctions and appropriate functionality for each type.

---

*Last Updated: January 30, 2025*
*Mobile Transfer Displays Version: 1.0.0*
