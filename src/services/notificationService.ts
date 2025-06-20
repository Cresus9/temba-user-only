import React from 'react';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email: boolean;
  push: boolean;
  types: string[];
}

class NotificationService {
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default preferences
          const defaultPreferences = {
            user_id: user.id,
            email: true,
            push: false,
            types: ['EVENT_REMINDER', 'TICKET_PURCHASED', 'PRICE_CHANGE', 'EVENT_CANCELLED', 'EVENT_UPDATED']
          };

          const { error: insertError } = await supabase
            .from('notification_preferences')
            .insert(defaultPreferences);

          if (insertError) throw insertError;
          return defaultPreferences;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur lors du chargement des préférences de notification:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // If enabling push notifications, check permission first
      if (preferences.push) {
        const permission = await this.checkPushPermission();
        if (permission !== 'granted') {
          // Don't enable push if permission not granted
          preferences.push = false;
        }
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences de notification:', error);
      throw error;
    }
  }

  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      toast.error('Les notifications push ne sont pas prises en charge dans votre navigateur', {
        icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
      });
      return false;
    }

    try {
      if (Notification.permission === 'denied') {
        toast.error(
          'Les notifications push sont bloquées. Veuillez les activer dans les paramètres de votre navigateur.',
          { 
            duration: 5000,
            icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
          }
        );
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.registerServiceWorker();
        return true;
      } else {
        toast.error('Autorisation de notification push refusée', {
          icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la demande d\'autorisation push:', error);
      toast.error('Échec de l\'activation des notifications push', {
        icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
      });
      return false;
    }
  }

  private async checkPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker enregistré:', registration);
      } catch (error) {
        console.error('Échec de l\'enregistrement du Service Worker:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();