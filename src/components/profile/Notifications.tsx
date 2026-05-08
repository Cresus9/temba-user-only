import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertCircle, Loader, Settings, BellRing, Calendar, Ticket, TrendingDown, XOctagon, RefreshCw } from 'lucide-react';
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
                <p className="text-sm font-medium text-gray-900">
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
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
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
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
          <Loader className="h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12 px-4">
        <div className="grid place-items-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-4 ring-1 ring-red-200">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <p className="eyebrow !mb-1">Erreur</p>
        <h3 className="text-ink mb-3">
          {t('notifications.error.load_title', { default: 'Failed to load preferences' })}
        </h3>
        <button
          onClick={loadPreferences}
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[12px] font-bold transition-colors shadow-card"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('common.try_again', { default: 'Try Again' })}
        </button>
      </div>
    );
  }

  // Map notification types to icons
  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    EVENT_REMINDER: Calendar,
    TICKET_PURCHASED: Ticket,
    PRICE_CHANGE: TrendingDown,
    EVENT_CANCELLED: XOctagon,
    EVENT_UPDATED: RefreshCw,
  };

  const Toggle = ({
    checked,
    disabled,
    onClick,
  }: {
    checked: boolean;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ring-1 ${
        checked ? 'bg-brand ring-brand-700' : 'bg-cream-deep ring-line'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-paper shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-line">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
          <BellRing className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow !mb-1">Préférences</p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Notifications
          </h2>
          <p className="text-[12px] text-ink-mute mt-1">
            Choisissez comment et quand vous voulez avoir des nouvelles de Temba.
          </p>
        </div>
      </div>

      {/* Section · Channels */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute !mb-0"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            Canaux de notification
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute">
            {[preferences.email, preferences.push].filter(Boolean).length} / 2 actifs
          </span>
        </div>

        <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden divide-y divide-line">
          {/* Email row */}
          <div className="flex items-center justify-between gap-3 p-4 hover:bg-cream/40 transition-colors">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`grid place-items-center w-10 h-10 rounded-xl flex-shrink-0 transition-colors ${
                  preferences.email
                    ? 'bg-brand-50 text-brand ring-1 ring-brand-100'
                    : 'bg-cream-deep text-ink-mute ring-1 ring-line'
                }`}
              >
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink leading-tight">
                  {t('notifications.channels.email.title', { default: 'Notifications par email' })}
                </p>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  {t('notifications.channels.email.description', {
                    default: 'Recevez vos confirmations et rappels par e-mail.',
                  })}
                </p>
              </div>
            </div>
            <Toggle
              checked={preferences.email}
              disabled={saving}
              onClick={() => handleToggle('email', !preferences.email)}
            />
          </div>

          {/* Push row */}
          <div className="flex items-center justify-between gap-3 p-4 hover:bg-cream/40 transition-colors">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`grid place-items-center w-10 h-10 rounded-xl flex-shrink-0 transition-colors ${
                  preferences.push
                    ? 'bg-accent/40 text-ink ring-1 ring-accent'
                    : 'bg-cream-deep text-ink-mute ring-1 ring-line'
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink leading-tight">
                  {t('notifications.channels.push.title', { default: 'Notifications push' })}
                </p>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  {t('notifications.channels.push.description', {
                    default: 'Alertes en direct dans votre navigateur.',
                  })}
                </p>
                {pushPermission === 'denied' && (
                  <button
                    onClick={openBrowserSettings}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-700 transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                    {t('notifications.push.enable_browser', { default: 'Activer dans le navigateur' })}
                  </button>
                )}
              </div>
            </div>
            {!('Notification' in window) ? (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded ring-1 ring-red-200 flex-shrink-0">
                {t('notifications.push.not_supported', { default: 'Non supporté' })}
              </span>
            ) : (
              <Toggle
                checked={preferences.push}
                disabled={saving || pushPermission === 'denied'}
                onClick={() => handleToggle('push', !preferences.push)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Section · Types */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute !mb-0"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            Types d'alertes
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums">
            {preferences.types.length} / {NOTIFICATION_TYPES.length} actifs
          </span>
        </div>

        <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden divide-y divide-line">
          {NOTIFICATION_TYPES.map((type) => {
            const Icon = typeIcons[type.id] ?? Bell;
            const enabled = preferences.types.includes(type.id);
            return (
              <div
                key={type.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-cream/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`grid place-items-center w-10 h-10 rounded-xl flex-shrink-0 transition-colors ${
                      enabled
                        ? 'bg-brand-50 text-brand ring-1 ring-brand-100'
                        : 'bg-cream-deep text-ink-mute ring-1 ring-line'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink leading-tight">
                      {t(`notifications.types.${type.id}.label`, { default: type.label })}
                    </p>
                    <p className="text-[12px] text-ink-mute mt-0.5">
                      {t(`notifications.types.${type.id}.description`, { default: type.description })}
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={enabled}
                  disabled={saving}
                  onClick={() => handleTypeToggle(type.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Saving indicator */}
        {saving && (
          <p className="mt-3 text-[11px] text-ink-mute inline-flex items-center gap-1.5">
            <Loader className="h-3 w-3 animate-spin" />
            Enregistrement...
          </p>
        )}
      </section>
    </div>
  );
}