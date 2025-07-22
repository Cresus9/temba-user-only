import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertCircle, Loader, Settings } from 'lucide-react';
import { notificationService, NotificationPreferences } from '../../services/notificationService';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPES = [
  { id: 'EVENT_REMINDER', label: 'Event Reminders', description: 'Get notified before your events start' },
  { id: 'TICKET_PURCHASED', label: 'Ticket Purchases', description: 'Receive confirmations for ticket purchases' },
  { id: 'PRICE_CHANGE', label: 'Price Changes', description: 'Get notified when event prices change' },
  { id: 'EVENT_CANCELLED', label: 'Event Cancellations', description: 'Be informed if an event is cancelled' },
  { id: 'EVENT_UPDATED', label: 'Event Updates', description: 'Receive updates about events you are attending' }
];

export default function Notifications() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const { t } = useTranslation();

  useEffect(() => {
    loadPreferences();
    checkPushPermission();
  }, []);

  const checkPushPermission = () => {
    if (!('Notification' in window)) {
      return;
    }
    setPushPermission(Notification.permission);
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error(t('notifications.error.load', { default: 'Failed to load notification preferences' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: 'email' | 'push', value: boolean) => {
    if (!preferences) return;

    try {
      setSaving(true);
      
      if (key === 'push' && value) {
        if (pushPermission === 'denied') {
          toast.error(
            t('notifications.error.push_blocked', { 
              default: 'Push notifications are blocked. Please enable them in your browser settings.'
            }),
            { 
              duration: 5000,
              icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
            }
          );
          return;
        }

        const granted = await notificationService.requestPushPermission();
        if (!granted) {
          return;
        }
        setPushPermission('granted');
      }

      const updatedPreferences = {
        ...preferences,
        [key]: value
      };

      await notificationService.updatePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      toast.success(
        t('notifications.updated', {
          channel: t(`notifications.channels.${key}`, { default: key }),
          status: value ? 'enabled' : 'disabled',
          default: `${key === 'email' ? 'Email' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}`
        }),
        {
          icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
        }
      );
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error(t('notifications.error.update', { default: 'Failed to update notification preferences' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTypeToggle = async (typeId: string) => {
    if (!preferences) return;

    try {
      setSaving(true);
      const newTypes = preferences.types.includes(typeId)
        ? preferences.types.filter(t => t !== typeId)
        : [...preferences.types, typeId];

      const updatedPreferences = {
        ...preferences,
        types: newTypes
      };

      await notificationService.updatePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      
      const type = NOTIFICATION_TYPES.find(t => t.id === typeId);
      if (type) {
        toast.success(
          t('notifications.type_updated', {
            type: t(`notifications.types.${typeId}.label`, { default: type.label }),
            status: newTypes.includes(typeId) ? 'enabled' : 'disabled',
            default: `${type.label} ${newTypes.includes(typeId) ? 'enabled' : 'disabled'}`
          }),
          {
            icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
          }
        );
      }
    } catch (error) {
      console.error('Error updating notification types:', error);
      toast.error(t('notifications.error.update_type', { default: 'Failed to update notification type' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setSaving(false);
    }
  };

  const openBrowserSettings = () => {
    if (pushPermission === 'denied') {
      toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <img className="h-10 w-10" src="/favicon.svg" alt="Temba"/>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-[var(--gray-900)]">
                  {t('notifications.push.enable_title', { default: 'Enable Push Notifications' })}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t('notifications.push.enable_steps', {
                    default: `1. Click the lock icon in your browser's address bar
                             2. Find "Notifications" in the permissions list
                             3. Change the setting to "Allow"`
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-[var(--gray-200)]">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[var(--primary-600)] hover:text-[var(--primary-500)] focus:outline-none"
            >
              {t('common.close', { default: 'Close' })}
            </button>
          </div>
        </div>
      ), { duration: 8000 });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">
          {t('notifications.error.load_title', { default: 'Failed to load preferences' })}
        </h2>
        <button
          onClick={loadPreferences}
          className="text-[var(--primary-600)] hover:text-[var(--primary-700)]"
        >
          {t('common.try_again', { default: 'Try Again' })}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-4">
          {t('notifications.channels.title', { default: 'Notification Channels' })}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-[var(--gray-200)]">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="font-medium text-[var(--gray-900)]">
                  {t('notifications.channels.email.title', { default: 'Email Notifications' })}
                </p>
                <p className="text-sm text-[var(--gray-600)]">
                  {t('notifications.channels.email.description', { default: 'Receive notifications via email' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('email', !preferences.email)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email ? 'bg-[var(--primary-600)]' : 'bg-[var(--gray-200)]'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-[var(--gray-200)]">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="font-medium text-[var(--gray-900)]">
                  {t('notifications.channels.push.title', { default: 'Push Notifications' })}
                </p>
                <p className="text-sm text-[var(--gray-600)]">
                  {t('notifications.channels.push.description', { default: 'Receive notifications in your browser' })}
                  {pushPermission === 'denied' && (
                    <button
                      onClick={openBrowserSettings}
                      className="ml-2 text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                    >
                      <Settings className="h-4 w-4 inline-block" />
                      <span className="ml-1">
                        {t('notifications.push.enable_browser', { default: 'Enable in browser' })}
                      </span>
                    </button>
                  )}
                </p>
              </div>
            </div>
            {!('Notification' in window) ? (
              <span className="text-sm text-[var(--error-600)]">
                {t('notifications.push.not_supported', { default: 'Not supported in your browser' })}
              </span>
            ) : (
              <button
                onClick={() => handleToggle('push', !preferences.push)}
                disabled={saving || pushPermission === 'denied'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.push ? 'bg-[var(--primary-600)]' : 'bg-[var(--gray-200)]'
                } ${(saving || pushPermission === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.push ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-4">
          {t('notifications.types.title', { default: 'Notification Types' })}
        </h2>
        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((type) => (
            <div
              key={type.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-[var(--gray-200)]"
            >
              <div>
                <p className="font-medium text-[var(--gray-900)]">
                  {t(`notifications.types.${type.id}.label`, { default: type.label })}
                </p>
                <p className="text-sm text-[var(--gray-600)]">
                  {t(`notifications.types.${type.id}.description`, { default: type.description })}
                </p>
              </div>
              <button
                onClick={() => handleTypeToggle(type.id)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.types.includes(type.id) ? 'bg-[var(--primary-600)]' : 'bg-[var(--gray-200)]'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.types.includes(type.id) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
