# Unregistered User Flow - Complete Implementation

## 📱 Overview

This document shows how to handle unregistered users in the ticket transfer system, including how they can retrieve tickets after registration.

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNREGISTERED USER FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   SENDER    │    │  UNREGISTERED│    │  BACKEND    │        │
│  │   (MOBILE)  │    │   RECIPIENT  │    │ (SUPABASE)  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                   │                   │               │
│         │ 1. Transfer       │                   │               │
│         │    to email       │                   │               │
│         ├──────────────────▶│                   │               │
│         │                   │                   │               │
│         │ 2. API Call       │                   │               │
│         ├──────────────────────────────────────▶│               │
│         │                   │                   │               │
│         │ 3. Create Pending │                   │               │
│         │    Transfer       │                   │               │
│         │◀──────────────────────────────────────┤               │
│         │                   │                   │               │
│         │ 4. Success        │                   │               │
│         │    Message        │                   │               │
│         │◀──────────────────┤                   │               │
│         │                   │                   │               │
│         │ 5. User Signs Up  │                   │               │
│         │    with Email     │                   │               │
│         │                   ├──────────────────▶│               │
│         │                   │                   │               │
│         │ 6. Check Pending  │                   │               │
│         │    Transfers      │                   │               │
│         │                   ├──────────────────▶│               │
│         │                   │                   │               │
│         │ 7. Return Pending │                   │               │
│         │    Transfers      │                   │               │
│         │                   │◀──────────────────┤               │
│         │                   │                   │               │
│         │ 8. Show Gift Icon │                   │               │
│         │    Notification   │                   │               │
│         │                   │                   │               │
│         │ 9. User Claims    │                   │               │
│         │    Transfer       │                   │               │
│         │                   ├──────────────────▶│               │
│         │                   │                   │               │
│         │ 10. Process Claim │                   │               │
│         │     & Transfer    │                   │               │
│         │                   │◀──────────────────┤               │
│         │                   │                   │               │
│         │ 11. Ticket Added  │                   │               │
│         │     to Account    │                   │               │
│         │                   │                   │               │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Implementation Components

### 1. Transfer to Unregistered User

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
import { ticketTransferService } from '../services/ticketTransferService';

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

  const handleTransfer = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const request = {
        ticketId,
        recipientEmail: transferMethod === 'email' ? formData.recipientEmail : undefined,
        recipientPhone: transferMethod === 'phone' ? formData.recipientPhone : undefined,
        recipientName: formData.recipientName,
        message: formData.message,
      };

      const response = await ticketTransferService.transferTicket(request);

      if (response.success) {
        if (response.instantTransfer) {
          Alert.alert(
            'Succès',
            'Billet transféré avec succès!',
            [{ text: 'OK', onPress: () => {
              onTransferComplete();
              onClose();
              resetForm();
            }}]
          );
        } else {
          Alert.alert(
            'Transfert en attente',
            `Le billet sera transféré à ${formData.recipientEmail || formData.recipientPhone} dès qu'il s'inscrira sur l'application.`,
            [{ text: 'OK', onPress: () => {
              onTransferComplete();
              onClose();
              resetForm();
            }}]
          );
        }
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
              onChangeText={(value) => setFormData(prev => ({
                ...prev,
                [transferMethod === 'email' ? 'recipientEmail' : 'recipientPhone']: value
              }))}
              keyboardType={transferMethod === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Nom du destinataire (optionnel)"
              value={formData.recipientName}
              onChangeText={(value) => setFormData(prev => ({ ...prev, recipientName: value }))}
            />

            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Message (optionnel)"
              value={formData.message}
              onChangeText={(value) => setFormData(prev => ({ ...prev, message: value }))}
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
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loadPendingTransfers, claimTransfer } from '../store/slices/ticketSlice';

export const PendingTransfersNotification: React.FC = () => {
  const dispatch = useDispatch();
  const { pendingTransfers, loading } = useSelector((state: RootState) => state.tickets);
  const [isVisible, setIsVisible] = useState(false);
  const [claimingTransfer, setClaimingTransfer] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadPendingTransfers());
  }, [dispatch]);

  const handleClaimTransfer = async (transferId: string) => {
    setClaimingTransfer(transferId);
    try {
      const result = await dispatch(claimTransfer(transferId));
      if (result.type.endsWith('/fulfilled')) {
        Alert.alert(
          'Succès',
          'Billet récupéré avec succès!',
          [{ text: 'OK', onPress: () => setIsVisible(false) }]
        );
      } else {
        Alert.alert('Erreur', 'Erreur lors de la réclamation du billet');
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

### 3. Signup with Pending Transfer Check

```typescript
// src/screens/SignupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { signup } from '../store/slices/authSlice';
import { loadPendingTransfers } from '../store/slices/ticketSlice';

export const SignupScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await dispatch(signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
      }));

      if (result.type.endsWith('/fulfilled')) {
        // Check for pending transfers after successful signup
        await dispatch(loadPendingTransfers());
        
        Alert.alert(
          'Inscription réussie',
          'Votre compte a été créé avec succès!',
          [{ text: 'OK' }]
        );
      } else {
        setError('Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    setError('');
    
    if (!formData.email) {
      setError('L\'email est requis');
      return false;
    }
    
    if (!formData.password) {
      setError('Le mot de passe est requis');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    if (!formData.name) {
      setError('Le nom est requis');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }

    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Rejoignez Temba et gérez vos billets facilement
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nom complet"
          value={formData.name}
          onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Téléphone (optionnel)"
          value={formData.phone}
          onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={formData.password}
          onChangeText={(value) => setFormData(prev => ({ ...prev, password: value }))}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          value={formData.confirmPassword}
          onChangeText={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signupButtonText}>Créer un compte</Text>
          )}
        </TouchableOpacity>
      </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 4. Backend Edge Function for Claiming Pending Transfers

```typescript
// supabase/functions/claim-pending-transfer/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transferId } = await req.json();

    if (!transferId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the transfer record
    const { data: transfer, error: transferError } = await supabaseClient
      .from('ticket_transfers')
      .select(`
        id,
        ticket_id,
        sender_id,
        recipient_email,
        recipient_phone,
        status,
        ticket:tickets (
          id,
          user_id,
          event_id,
          ticket_type_id,
          status
        )
      `)
      .eq('id', transferId)
      .eq('status', 'PENDING')
      .single();

    if (transferError || !transfer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer not found or already processed' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user is the intended recipient
    const userEmail = user.email?.toLowerCase();
    const userPhone = user.phone;
    
    const isRecipient = (
      (transfer.recipient_email && transfer.recipient_email.toLowerCase() === userEmail) ||
      (transfer.recipient_phone && transfer.recipient_phone === userPhone)
    );

    if (!isRecipient) {
      return new Response(
        JSON.stringify({ success: false, error: 'You are not the intended recipient of this transfer' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if ticket is still valid
    if (!transfer.ticket || transfer.ticket.status !== 'VALID') {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticket is no longer valid' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Start a transaction to claim the transfer
    const { data: claimResult, error: claimError } = await supabaseClient.rpc('claim_pending_transfer', {
      transfer_id: transferId,
      new_user_id: user.id
    });

    if (claimError) {
      console.error('Claim transfer error:', claimError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to claim transfer' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transfer claimed successfully',
        ticketId: transfer.ticket_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Claim pending transfer error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### 5. Database Function for Claiming Transfers

```sql
-- supabase/migrations/claim_pending_transfer_function.sql
CREATE OR REPLACE FUNCTION claim_pending_transfer(
  transfer_id UUID,
  new_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transfer_record RECORD;
  ticket_record RECORD;
  result JSON;
BEGIN
  -- Get the transfer record
  SELECT * INTO transfer_record
  FROM ticket_transfers
  WHERE id = transfer_id
    AND status = 'PENDING'
  FOR UPDATE;

  -- Check if transfer exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transfer not found or already processed'
    );
  END IF;

  -- Get the ticket record
  SELECT * INTO ticket_record
  FROM tickets
  WHERE id = transfer_record.ticket_id
  FOR UPDATE;

  -- Check if ticket exists and is valid
  IF NOT FOUND OR ticket_record.status != 'VALID' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket not found or no longer valid'
    );
  END IF;

  -- Update the ticket ownership
  UPDATE tickets
  SET 
    user_id = new_user_id,
    transferred_from = ticket_record.user_id,
    updated_at = NOW()
  WHERE id = transfer_record.ticket_id;

  -- Update the transfer status
  UPDATE ticket_transfers
  SET 
    status = 'COMPLETED',
    recipient_id = new_user_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = transfer_id;

  -- Create a notification for the sender
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    transfer_record.sender_id,
    'transfer_completed',
    'Transfert terminé',
    'Votre billet a été récupéré par le destinataire',
    json_build_object(
      'transfer_id', transfer_id,
      'ticket_id', transfer_record.ticket_id,
      'recipient_id', new_user_id
    )
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Transfer claimed successfully',
    'ticket_id', transfer_record.ticket_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to claim transfer: ' || SQLERRM
    );
END;
$$;
```

## 🔄 Complete User Journey

### 1. Transfer to Unregistered User
```
User A (Registered) → Transfer Ticket → User B (Unregistered)
├── Select ticket to transfer
├── Enter User B's email/phone
├── Add optional message
├── Confirm transfer
├── Backend creates PENDING transfer
└── User A sees "Transfer en attente" message
```

### 2. Unregistered User Signs Up
```
User B (Unregistered) → Sign Up → Check Pending Transfers
├── Enter email/phone (same as transfer)
├── Create account
├── Backend checks for pending transfers
├── Finds pending transfer
└── Shows gift icon notification
```

### 3. Claim Pending Transfer
```
User B → Tap Gift Icon → View Pending Transfers → Claim Transfer
├── See list of pending transfers
├── View ticket details
├── Tap "Réclamer le billet"
├── Backend processes claim
├── Ticket transferred to User B
└── User B sees ticket in "Received" tab
```

## 🎯 Key Features

### ✅ **Seamless Experience**
- **No Registration Required**: Users can receive tickets without signing up first
- **Automatic Detection**: Pending transfers detected immediately after signup
- **Visual Notifications**: Gift icon shows pending transfers
- **One-Click Claim**: Simple process to claim tickets

### ✅ **Security & Validation**
- **Email/Phone Matching**: Only intended recipient can claim
- **Status Validation**: Only valid tickets can be claimed
- **Atomic Operations**: Database transactions ensure data consistency
- **Audit Trail**: Complete history of all transfers

### ✅ **User Feedback**
- **Clear Messages**: Users understand what's happening
- **Status Updates**: Real-time updates on transfer status
- **Error Handling**: Graceful handling of edge cases
- **Notifications**: Senders notified when transfers are claimed

This implementation provides a complete, user-friendly way to handle unregistered users and allow them to retrieve tickets after registration.

---

*Last Updated: January 30, 2025*
*Unregistered User Flow Version: 1.0.0*
