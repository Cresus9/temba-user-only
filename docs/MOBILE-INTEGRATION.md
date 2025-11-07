# Mobile App Integration Guide

## 📱 Overview

This guide provides comprehensive instructions for implementing the Temba ticket transfer system in a mobile application, including React Native setup, backend integration, and complete feature implementation.

## 🏗️ Mobile Architecture

### Technology Stack
- **Framework**: React Native with TypeScript
- **State Management**: Redux Toolkit or Context API
- **Navigation**: React Navigation v6
- **HTTP Client**: Axios or Fetch API
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **UI Components**: React Native Elements or NativeBase

### Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── services/           # API service layers
├── store/              # State management
├── navigation/         # Navigation configuration
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript definitions
└── constants/          # App constants
```

## 🔧 Backend Integration

### 1. Supabase Configuration

#### Install Dependencies
```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
```

#### Supabase Client Setup
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. API Service Layer

#### Base API Service
```typescript
// src/services/api.ts
import { supabase } from '../lib/supabase';

class ApiService {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  async callFunction(functionName: string, body: any) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
```

#### Ticket Transfer Service
```typescript
// src/services/ticketTransferService.ts
import { apiService } from './api';

export interface TransferTicketRequest {
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}

export interface TransferTicketResponse {
  success: boolean;
  transferId?: string;
  instantTransfer?: boolean;
  message?: string;
  error?: string;
}

export interface PendingTransfer {
  id: string;
  ticket_id: string;
  sender_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  sender: {
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    event_id: string;
    ticket_type_id: string;
    status: string;
    event: {
      title: string;
      date: string;
      venue: string;
    };
  } | null;
}

class TicketTransferService {
  async transferTicket(request: TransferTicketRequest): Promise<TransferTicketResponse> {
    try {
      const response = await apiService.callFunction('transfer-ticket', request);
      return response;
    } catch (error) {
      console.error('Transfer ticket error:', error);
      return {
        success: false,
        error: 'Échec du transfert du billet'
      };
    }
  }

  async claimPendingTransfer(transferId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiService.callFunction('claim-pending-transfer', {
        transferId
      });
      return response;
    } catch (error) {
      console.error('Claim transfer error:', error);
      return {
        success: false,
        error: 'Erreur lors de la réclamation du billet'
      };
    }
  }

  async getPendingTransfers(): Promise<PendingTransfer[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_transfers')
        .select(`
          id,
          ticket_id,
          sender_id,
          recipient_email,
          recipient_phone,
          recipient_name,
          message,
          status,
          created_at,
          sender:profiles!ticket_transfers_sender_id_fkey (
            name,
            email
          ),
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
        .eq('status', 'PENDING')
        .or(`recipient_email.eq.${userEmail},recipient_phone.eq.${userPhone}`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get pending transfers error:', error);
      return [];
    }
  }
}

export const ticketTransferService = new TicketTransferService();
```

## 🎨 UI Components

### 1. Transfer Ticket Modal

```typescript
// src/components/TransferTicketModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ticketTransferService, TransferTicketRequest } from '../services/ticketTransferService';

interface TransferTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  onTransferComplete: () => void;
}

export const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  visible,
  onClose,
  ticketId,
  ticketTitle,
  onTransferComplete,
}) => {
  const [formData, setFormData] = useState({
    recipientEmail: '',
    recipientPhone: '',
    recipientName: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferMethod, setTransferMethod] = useState<'email' | 'phone'>('email');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    setError('');
    if (transferMethod === 'email') {
      if (!formData.recipientEmail) {
        setError('L\'email est requis');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.recipientEmail)) {
        setError('Veuillez entrer une adresse email valide');
        return false;
      }
    } else {
      if (!formData.recipientPhone) {
        setError('Le numéro de téléphone est requis');
        return false;
      }
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(formData.recipientPhone.replace(/\s/g, ''))) {
        setError('Veuillez entrer un numéro de téléphone valide');
        return false;
      }
    }
    return true;
  };

  const handleTransfer = () => {
    if (!validateForm()) return;

    setConfirmedData({
      recipient: transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone,
      method: transferMethod,
      name: formData.recipientName,
      message: formData.message,
    });
    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    if (!confirmedData) return;

    setIsLoading(true);
    setError('');

    try {
      const request: TransferTicketRequest = {
        ticketId,
        recipientEmail: confirmedData.method === 'email' ? confirmedData.recipient : undefined,
        recipientPhone: confirmedData.method === 'phone' ? confirmedData.recipient : undefined,
        recipientName: confirmedData.name,
        message: confirmedData.message,
      };

      const response = await ticketTransferService.transferTicket(request);

      if (response.success) {
        Alert.alert(
          'Succès',
          response.instantTransfer
            ? 'Billet transféré avec succès!'
            : 'Transfert en attente - le destinataire recevra le billet lors de son inscription!'
        );
        onTransferComplete();
        onClose();
        resetForm();
      } else {
        setError(response.error || 'Échec du transfert');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      recipientEmail: '',
      recipientPhone: '',
      recipientName: '',
      message: '',
    });
    setShowConfirmation(false);
    setConfirmedData(null);
    setError('');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Transférer le billet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.ticketTitle}>{ticketTitle}</Text>

          {!showConfirmation ? (
            <View style={styles.form}>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    transferMethod === 'email' && styles.methodButtonActive,
                  ]}
                  onPress={() => setTransferMethod('email')}
                >
                  <Text style={[
                    styles.methodText,
                    transferMethod === 'email' && styles.methodTextActive,
                  ]}>
                    Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    transferMethod === 'phone' && styles.methodButtonActive,
                  ]}
                  onPress={() => setTransferMethod('phone')}
                >
                  <Text style={[
                    styles.methodText,
                    transferMethod === 'phone' && styles.methodTextActive,
                  ]}>
                    Téléphone
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={transferMethod === 'email' ? 'Email du destinataire' : 'Téléphone du destinataire'}
                value={transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone}
                onChangeText={(value) => handleInputChange(
                  transferMethod === 'email' ? 'recipientEmail' : 'recipientPhone',
                  value
                )}
                keyboardType={transferMethod === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Nom du destinataire (optionnel)"
                value={formData.recipientName}
                onChangeText={(value) => handleInputChange('recipientName', value)}
              />

              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Message (optionnel)"
                value={formData.message}
                onChangeText={(value) => handleInputChange('message', value)}
                multiline
                numberOfLines={3}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.transferButton}
                onPress={handleTransfer}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.transferButtonText}>Transférer</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationTitle}>Confirmer le transfert</Text>
              <Text style={styles.confirmationText}>
                Transférer le billet "{ticketTitle}" à {confirmedData.recipient}?
              </Text>
              {confirmedData.message && (
                <Text style={styles.messageText}>Message: "{confirmedData.message}"</Text>
              )}

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowConfirmation(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmTransfer}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 18,
    color: '#666',
  },
  ticketTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  form: {
    flex: 1,
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  methodButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodText: {
    fontSize: 16,
    color: '#666',
  },
  methodTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 15,
  },
  transferButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  transferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmation: {
    flex: 1,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 2. Pending Transfers Notification

```typescript
// src/components/PendingTransfersNotification.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { ticketTransferService, PendingTransfer } from '../services/ticketTransferService';

interface PendingTransfersNotificationProps {
  onTransferClaimed: () => void;
}

export const PendingTransfersNotification: React.FC<PendingTransfersNotificationProps> = ({
  onTransferClaimed,
}) => {
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [claimingTransfer, setClaimingTransfer] = useState<string | null>(null);

  useEffect(() => {
    loadPendingTransfers();
  }, []);

  const loadPendingTransfers = async () => {
    try {
      const transfers = await ticketTransferService.getPendingTransfers();
      setPendingTransfers(transfers);
    } catch (error) {
      console.error('Error loading pending transfers:', error);
    }
  };

  const handleClaimTransfer = async (transferId: string) => {
    setClaimingTransfer(transferId);
    try {
      const result = await ticketTransferService.claimPendingTransfer(transferId);
      if (result.success) {
        Alert.alert('Succès', 'Billet récupéré avec succès!');
        await loadPendingTransfers();
        onTransferClaimed();
        setIsVisible(false);
      } else {
        Alert.alert('Erreur', result.error || 'Erreur lors de la réclamation');
      }
    } catch (error) {
      console.error('Claim transfer error:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    } finally {
      setClaimingTransfer(null);
    }
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

  if (pendingTransfers.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.giftIcon}>🎁</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingTransfers.length}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={isVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>
                Billets en attente ({pendingTransfers.length})
              </Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={pendingTransfers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.transferItem}>
                  <View style={styles.transferHeader}>
                    <View style={styles.senderInfo}>
                      <Text style={styles.senderName}>De {item.sender.name}</Text>
                      <Text style={styles.transferDate}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>En attente</Text>
                    </View>
                  </View>

                  {item.message && (
                    <View style={styles.messageContainer}>
                      <Text style={styles.messageText}>"{item.message}"</Text>
                    </View>
                  )}

                  {item.ticket?.event ? (
                    <View style={styles.ticketPreview}>
                      <Text style={styles.eventTitle}>{item.ticket.event.title}</Text>
                      <Text style={styles.eventDetails}>
                        📅 {item.ticket.event.date} | 📍 {item.ticket.event.venue}
                      </Text>
                      <Text style={styles.ticketType}>
                        Type: {item.ticket.ticket_type_id}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.loadingText}>Chargement des détails...</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimTransfer(item.id)}
                    disabled={claimingTransfer === item.id}
                  >
                    {claimingTransfer === item.id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.claimButtonText}>Réclamer le billet</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              style={styles.transferList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  giftIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeText: {
    fontSize: 18,
    color: '#666',
  },
  transferList: {
    maxHeight: 400,
  },
  transferItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transferDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  ticketPreview: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  eventDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ticketType: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  claimButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 3. Ticket Display Components

#### My Tickets (Owned by User)
```typescript
// src/components/MyTicketsList.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { TransferTicketModal } from './TransferTicketModal';

interface Ticket {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: string;
  qr_code: string;
}

interface TicketListProps {
  tickets: Ticket[];
  onRefresh: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onRefresh }) => {
  const [transferModal, setTransferModal] = useState<{
    visible: boolean;
    ticketId: string;
    ticketTitle: string;
  }>({
    visible: false,
    ticketId: '',
    ticketTitle: '',
  });

  const handleTransferTicket = (ticket: Ticket) => {
    setTransferModal({
      visible: true,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
    });
  };

  const handleTransferComplete = () => {
    onRefresh();
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>{item.title}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'VALID' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'VALID' ? 'Valide' : 'Utilisé'}
          </Text>
        </View>
      </View>

      <View style={styles.ticketDetails}>
        <Text style={styles.detailText}>📅 {item.date}</Text>
        <Text style={styles.detailText}>📍 {item.venue}</Text>
      </View>

      <View style={styles.ticketActions}>
        <TouchableOpacity
          style={styles.transferButton}
          onPress={() => handleTransferTicket(item)}
        >
          <Text style={styles.transferButtonText}>Transférer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={renderTicket}
        showsVerticalScrollIndicator={false}
      />

      <TransferTicketModal
        visible={transferModal.visible}
        onClose={() => setTransferModal({ visible: false, ticketId: '', ticketTitle: '' })}
        ticketId={transferModal.ticketId}
        ticketTitle={transferModal.ticketTitle}
        onTransferComplete={handleTransferComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  ticketDetails: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ticketActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  transferButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

## 🔄 State Management

### 1. Redux Store Setup

```typescript
// src/store/slices/ticketSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ticketTransferService, PendingTransfer } from '../../services/ticketTransferService';

interface TicketState {
  tickets: any[];
  pendingTransfers: PendingTransfer[];
  loading: boolean;
  error: string | null;
}

const initialState: TicketState = {
  tickets: [],
  pendingTransfers: [],
  loading: false,
  error: null,
};

export const loadPendingTransfers = createAsyncThunk(
  'tickets/loadPendingTransfers',
  async () => {
    const transfers = await ticketTransferService.getPendingTransfers();
    return transfers;
  }
);

export const claimTransfer = createAsyncThunk(
  'tickets/claimTransfer',
  async (transferId: string) => {
    const result = await ticketTransferService.claimPendingTransfer(transferId);
    if (!result.success) {
      throw new Error(result.error);
    }
    return transferId;
  }
);

const ticketSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPendingTransfers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPendingTransfers.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingTransfers = action.payload;
      })
      .addCase(loadPendingTransfers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load pending transfers';
      })
      .addCase(claimTransfer.fulfilled, (state, action) => {
        state.pendingTransfers = state.pendingTransfers.filter(
          transfer => transfer.id !== action.payload
        );
      });
  },
});

export const { clearError } = ticketSlice.actions;
export default ticketSlice.reducer;
```

### 2. Store Configuration

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import ticketReducer from './slices/ticketSlice';

export const store = configureStore({
  reducer: {
    tickets: ticketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## 📱 Screen Implementation

### 1. Main Tickets Screen

```typescript
// src/screens/TicketsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { TicketList } from '../components/TicketList';
import { PendingTransfersNotification } from '../components/PendingTransfersNotification';
import { loadPendingTransfers } from '../store/slices/ticketSlice';

export const TicketsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { tickets, pendingTransfers, loading } = useSelector((state: RootState) => state.tickets);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTickets();
    dispatch(loadPendingTransfers());
  }, []);

  const loadTickets = async () => {
    // Load user tickets from Supabase
    // Implementation depends on your ticket loading logic
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    dispatch(loadPendingTransfers());
    setRefreshing(false);
  };

  const handleTransferClaimed = () => {
    loadTickets();
    dispatch(loadPendingTransfers());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Billets</Text>
      
      <TicketList
        tickets={tickets}
        onRefresh={handleRefresh}
      />

      <PendingTransfersNotification
        onTransferClaimed={handleTransferClaimed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    backgroundColor: 'white',
  },
});
```

## 🔔 Real-time Updates

### 1. Supabase Realtime Integration

```typescript
// src/hooks/useRealtimeUpdates.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDispatch } from 'react-redux';
import { loadPendingTransfers } from '../store/slices/ticketSlice';

export const useRealtimeUpdates = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Subscribe to ticket_transfers table changes
    const subscription = supabase
      .channel('ticket_transfers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_transfers',
        },
        (payload) => {
          console.log('Ticket transfer change:', payload);
          // Reload pending transfers when changes occur
          dispatch(loadPendingTransfers());
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);
};
```

### 2. Push Notifications

```typescript
// src/services/notificationService.ts
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

class NotificationService {
  configure() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
        // Send token to your backend
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        // Handle notification
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
  }

  showLocalNotification(title: string, message: string) {
    PushNotification.localNotification({
      title,
      message,
      playSound: true,
      soundName: 'default',
    });
  }
}

export const notificationService = new NotificationService();
```

## 🧪 Testing

### 1. Unit Tests

```typescript
// src/services/__tests__/ticketTransferService.test.ts
import { ticketTransferService } from '../ticketTransferService';

describe('TicketTransferService', () => {
  it('should transfer ticket successfully', async () => {
    const mockRequest = {
      ticketId: 'test-ticket-id',
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      message: 'Test message',
    };

    const result = await ticketTransferService.transferTicket(mockRequest);
    
    expect(result.success).toBe(true);
    expect(result.transferId).toBeDefined();
  });

  it('should handle transfer errors', async () => {
    const mockRequest = {
      ticketId: 'invalid-ticket-id',
      recipientEmail: 'test@example.com',
    };

    const result = await ticketTransferService.transferTicket(mockRequest);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Integration Tests

```typescript
// src/screens/__tests__/TicketsScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../../store';
import { TicketsScreen } from '../TicketsScreen';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('TicketsScreen', () => {
  it('should render tickets list', () => {
    const { getByText } = renderWithProvider(<TicketsScreen />);
    expect(getByText('Mes Billets')).toBeTruthy();
  });

  it('should show transfer modal when transfer button is pressed', async () => {
    const { getByText } = renderWithProvider(<TicketsScreen />);
    
    // Mock ticket data and find transfer button
    const transferButton = getByText('Transférer');
    fireEvent.press(transferButton);
    
    await waitFor(() => {
      expect(getByText('Transférer le billet')).toBeTruthy();
    });
  });
});
```

## 🚀 Deployment

### 1. Build Configuration

```json
// package.json
{
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace TembaApp.xcworkspace -scheme TembaApp -configuration Release archive"
  }
}
```

### 2. Environment Configuration

```typescript
// src/config/environment.ts
export const config = {
  supabaseUrl: __DEV__ 
    ? 'https://your-dev-project.supabase.co'
    : 'https://uwmlagvsivxqocklxbbo.supabase.co',
  supabaseAnonKey: __DEV__
    ? 'your-dev-anon-key'
    : 'your-prod-anon-key',
};
```

## 📋 Implementation Checklist

### Backend Integration
- [ ] Supabase client configuration
- [ ] API service layer implementation
- [ ] Authentication integration
- [ ] Real-time subscriptions setup

### UI Components
- [ ] Transfer ticket modal
- [ ] Pending transfers notification
- [ ] Ticket list with transfer buttons
- [ ] Status indicators and badges

### State Management
- [ ] Redux store setup
- [ ] Async thunks for API calls
- [ ] Real-time updates integration
- [ ] Error handling

### Testing
- [ ] Unit tests for services
- [ ] Component tests
- [ ] Integration tests
- [ ] E2E tests

### Deployment
- [ ] Build configuration
- [ ] Environment setup
- [ ] App store preparation
- [ ] Push notification setup

## 📱 Additional Resources

### Ticket Display Components
For detailed implementation of ticket display states, see:
- **[Mobile Transfer Displays](MOBILE-TRANSFER-DISPLAYS.md)** - Complete UI components for sent and received tickets
- **[Mobile Ticket States Visual](MOBILE-TICKET-STATES-VISUAL.md)** - Visual guide for different ticket states

### Key Display Features
- **Sent Tickets**: Blurred preview with transfer history
- **Received Tickets**: Full access with sender information
- **Used Tickets**: Clear scan status and limited actions
- **Status Indicators**: Color-coded status badges
- **Touch Interactions**: Intuitive mobile gestures

---

*Last Updated: January 30, 2025*
*Mobile Integration Guide Version: 1.0.0*
