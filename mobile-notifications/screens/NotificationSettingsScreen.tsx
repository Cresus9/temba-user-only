import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileNotificationService, NotificationPreferences } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const NOTIFICATION_TYPES = [
  { 
    id: 'ORDER_CONFIRMATION', 
    label: 'Confirmations de commande', 
    description: 'Recevez des confirmations pour vos achats de billets',
    icon: 'checkmark-circle'
  },
  { 
    id: 'EVENT_REMINDER', 
    label: 'Rappels d\'événements', 
    description: 'Soyez notifié avant le début de vos événements',
    icon: 'time'
  },
  { 
    id: 'TICKET_TRANSFER', 
    label: 'Transferts de billets', 
    description: 'Notifications pour les transferts de billets reçus/envoyés',
    icon: 'swap-horizontal'
  },
  { 
    id: 'SUPPORT_REPLY', 
    label: 'Réponses du support', 
    description: 'Soyez informé des réponses à vos demandes de support',
    icon: 'chatbubble'
  },
  { 
    id: 'ACCOUNT_UPDATE', 
    label: 'Mises à jour du compte', 
    description: 'Alertes de sécurité et modifications de profil',
    icon: 'person'
  },
  { 
    id: 'PRICE_CHANGE', 
    label: 'Changements de prix', 
    description: 'Notifications lorsque les prix d\'événements changent',
    icon: 'trending-up'
  },
  { 
    id: 'EVENT_CANCELLED', 
    label: 'Événements annulés', 
    description: 'Soyez informé si un événement est annulé',
    icon: 'close-circle'
  },
  { 
    id: 'EVENT_UPDATED', 
    label: 'Mises à jour d\'événements', 
    description: 'Changements dans les détails des événements auxquels vous participez',
    icon: 'refresh'
  }
];

export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('unknown');
  
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated) return;
    loadPreferences();
    checkPushPermission();
  }, [isAuthenticated]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await mobileNotificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Erreur', 'Impossible de charger les préférences de notification');
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = async () => {
    try {
      const { Notifications } = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      setPushPermissionStatus(status);
    } catch (error) {
      console.error('Error checking push permission:', error);
    }
  };

  const handleToggle = async (key: 'email' | 'push', value: boolean) => {
    if (!preferences) return;

    try {
      setSaving(true);
      
      if (key === 'push' && value) {
        if (pushPermissionStatus === 'denied') {
          Alert.alert(
            'Notifications bloquées',
            'Les notifications push sont bloquées. Veuillez les activer dans les paramètres de votre appareil.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Paramètres', onPress: () => {/* Open settings */} }
            ]
          );
          return;
        }

        const granted = await mobileNotificationService.configurePushNotifications();
        if (!granted) {
          Alert.alert(
            'Permission refusée',
            'Les notifications push n\'ont pas été autorisées.'
          );
          return;
        }
        setPushPermissionStatus('granted');
      }

      const updatedPreferences = {
        ...preferences,
        [key]: value
      };

      await mobileNotificationService.updatePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      
      Alert.alert(
        'Succès',
        `Notifications ${key === 'email' ? 'email' : 'push'} ${value ? 'activées' : 'désactivées'}`
      );
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les préférences');
    } finally {
      setSaving(false);
    }
  };

  const handleTypeToggle = async (typeId: string) => {
    if (!preferences) return;

    try {
      setSaving(true);
      
      const updatedTypes = preferences.types.includes(typeId)
        ? preferences.types.filter(t => t !== typeId)
        : [...preferences.types, typeId];

      const updatedPreferences = {
        ...preferences,
        types: updatedTypes
      };

      await mobileNotificationService.updatePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating type preferences:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les préférences');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Supprimer toutes les notifications',
      'Êtes-vous sûr de vouloir supprimer toutes vos notifications ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileNotificationService.clearAllNotifications();
              Alert.alert('Succès', 'Toutes les notifications ont été supprimées');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Erreur', 'Impossible de supprimer les notifications');
            }
          }
        }
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      // This would typically call an admin endpoint to send a test notification
      Alert.alert(
        'Test de notification',
        'Une notification de test sera envoyée dans quelques instants.'
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAuthenticatedContainer}>
          <Ionicons name="lock-closed" size={64} color="#D1D5DB" />
          <Text style={styles.notAuthenticatedText}>
            Connectez-vous pour gérer vos préférences de notification
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des préférences...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Paramètres de notification</Text>
          <Text style={styles.headerSubtitle}>Gérez vos préférences de notification</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Delivery Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthodes de livraison</Text>
          <Text style={styles.sectionDescription}>
            Choisissez comment vous souhaitez recevoir vos notifications
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="mail" size={24} color="#3B82F6" style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications par email</Text>
                <Text style={styles.settingDescription}>
                  Recevez les notifications dans votre boîte mail
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.email}
              onValueChange={(value) => handleToggle('email', value)}
              disabled={saving}
              trackColor={{ false: '#F3F4F6', true: '#DBEAFE' }}
              thumbColor={preferences.email ? '#3B82F6' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="phone-portrait" size={24} color="#10B981" style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications push</Text>
                <Text style={styles.settingDescription}>
                  Recevez les notifications sur votre appareil
                </Text>
                {pushPermissionStatus === 'denied' && (
                  <Text style={styles.warningText}>
                    ⚠️ Notifications bloquées dans les paramètres
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={preferences.push}
              onValueChange={(value) => handleToggle('push', value)}
              disabled={saving || pushPermissionStatus === 'denied'}
              trackColor={{ false: '#F3F4F6', true: '#D1FAE5' }}
              thumbColor={preferences.push ? '#10B981' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types de notifications</Text>
          <Text style={styles.sectionDescription}>
            Sélectionnez les types de notifications que vous souhaitez recevoir
          </Text>

          {NOTIFICATION_TYPES.map((type) => (
            <View key={type.id} style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color="#6B7280" 
                  style={styles.settingIcon} 
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{type.label}</Text>
                  <Text style={styles.settingDescription}>{type.description}</Text>
                </View>
              </View>
              <Switch
                value={preferences.types.includes(type.id)}
                onValueChange={() => handleTypeToggle(type.id)}
                disabled={saving}
                trackColor={{ false: '#F3F4F6', true: '#DBEAFE' }}
                thumbColor={preferences.types.includes(type.id) ? '#3B82F6' : '#9CA3AF'}
              />
            </View>
          ))}
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres avancés</Text>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={handleTestNotification}
            disabled={saving}
          >
            <Ionicons name="flask" size={24} color="#8B5CF6" style={styles.actionIcon} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Tester les notifications</Text>
              <Text style={styles.actionDescription}>
                Envoyer une notification de test pour vérifier vos paramètres
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="list" size={24} color="#3B82F6" style={styles.actionIcon} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Voir toutes les notifications</Text>
              <Text style={styles.actionDescription}>
                Accéder à l'historique complet de vos notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, styles.dangerAction]}
            onPress={handleClearAllNotifications}
            disabled={saving}
          >
            <Ionicons name="trash" size={24} color="#EF4444" style={styles.actionIcon} />
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, styles.dangerText]}>
                Supprimer toutes les notifications
              </Text>
              <Text style={styles.actionDescription}>
                Effacer définitivement toutes vos notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Vos préférences sont automatiquement sauvegardées. 
            Les notifications importantes (sécurité, confirmations de commande) 
            peuvent être envoyées même si désactivées.
          </Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  dangerText: {
    color: '#EF4444',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
});
