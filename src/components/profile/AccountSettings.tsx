import React, { useState } from 'react';
import { Shield, Key, AlertTriangle, Loader, Lock, History, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/TranslationContext';
import LoginHistory from './LoginHistory';
import toast from 'react-hot-toast';

export default function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('account.password.mismatch', { default: 'New passwords do not match' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast.success(t('account.password.success', { default: 'Password updated successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || t('account.password.error', { default: 'Failed to update password' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== 'delete my account') {
      toast.error(t('account.delete.invalid_confirmation', { default: 'Please type "delete my account" to confirm' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      return;
    }

    try {
      setLoading(true);

      // Mark user as deleted
      const { error: deleteError } = await supabase.auth.updateUser({
        data: { deleted: true }
      });

      if (deleteError) throw deleteError;

      // Sign out the user
      await logout();
      
      // Redirect to home page
      navigate('/');
      toast.success(t('account.delete.success', { default: 'Your account has been deleted' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast.error(t('account.delete.error', { default: 'Failed to delete account. Please contact support for assistance.' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const inputClass =
    'w-full h-11 px-3.5 bg-paper border border-line text-ink placeholder:text-ink-mute/60 ' +
    'rounded-lg text-[14px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all';
  const labelClass = 'block text-[12px] font-semibold text-ink mb-1.5';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-line">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
          <SettingsIcon className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow !mb-1">Sécurité &amp; compte</p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {t('account.settings.title', { default: 'Paramètres du compte' })}
          </h2>
          <p className="text-[12px] text-ink-mute mt-1">
            Gérez votre mot de passe, la sécurité et la suppression du compte.
          </p>
        </div>
      </div>

      {/* Password Change */}
      <section className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
        <header className="flex items-center gap-2.5 px-5 py-4 bg-cream border-b border-line">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 ring-1 ring-brand-100">
            <Key className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              Mot de passe
            </p>
            <h3
              className="text-[15px] font-bold text-ink !mb-0"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              {t('account.password.title', { default: 'Changer le mot de passe' })}
            </h3>
          </div>
        </header>

        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>
              {t('account.password.current', { default: 'Mot de passe actuel' })}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {t('account.password.new', { default: 'Nouveau mot de passe' })}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
              />
              <p className="text-[11px] text-ink-mute mt-1">
                Minimum 8 caractères, mélange recommandé.
              </p>
            </div>
            <div>
              <label className={labelClass}>
                {t('account.password.confirm', { default: 'Confirmer le mot de passe' })}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-line">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-card"
            >
              {loading ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  {t('account.password.updating', { default: 'Enregistrement...' })}
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  {t('account.password.update', { default: 'Mettre à jour' })}
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Security Settings */}
      <section className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
        <header className="flex items-center gap-2.5 px-5 py-4 bg-cream border-b border-line">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 ring-1 ring-brand-100">
            <Shield className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              Sécurité
            </p>
            <h3
              className="text-[15px] font-bold text-ink !mb-0"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              {t('account.security.title', { default: 'Paramètres de sécurité' })}
            </h3>
          </div>
        </header>

        <div className="divide-y divide-line">
          {/* 2FA */}
          <div className="flex items-start sm:items-center justify-between gap-3 p-5 hover:bg-cream/40 transition-colors flex-col sm:flex-row">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-cream-deep text-ink-mute ring-1 ring-line flex-shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink leading-tight">
                  {t('account.security.2fa.title', { default: 'Authentification à deux facteurs' })}
                </p>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  {t('account.security.2fa.description', {
                    default: 'Ajoutez une couche de sécurité supplémentaire à votre compte.',
                  })}
                </p>
                <span className="inline-flex items-center mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                  Bientôt
                </span>
              </div>
            </div>
            <button
              disabled
              className="inline-flex items-center justify-center h-9 px-4 bg-cream-deep text-ink-mute border border-line rounded-lg text-[12px] font-bold cursor-not-allowed flex-shrink-0"
            >
              {t('account.security.2fa.enable', { default: 'Activer' })}
            </button>
          </div>

          {/* Login History */}
          <div className="p-5 hover:bg-cream/40 transition-colors">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100 flex-shrink-0">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink leading-tight">
                    {t('account.security.login_history.title', { default: 'Historique de connexion' })}
                  </p>
                  <p className="text-[12px] text-ink-mute mt-0.5">
                    {t('account.security.login_history.description', {
                      default: 'Consultez vos connexions récentes pour repérer toute activité suspecte.',
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginHistory(!showLoginHistory)}
                className="inline-flex items-center justify-center h-9 px-4 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-brand hover:text-brand transition-colors flex-shrink-0"
              >
                {showLoginHistory
                  ? t('account.security.login_history.hide', { default: 'Masquer' })
                  : t('account.security.login_history.view', { default: 'Voir l\'historique' })}
              </button>
            </div>
            {showLoginHistory && (
              <div className="mt-5 pt-5 border-t border-line">
                <LoginHistory />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete Account */}
      <section className="bg-paper rounded-xl2 border border-red-200 shadow-card overflow-hidden">
        <header className="flex items-center gap-2.5 px-5 py-4 bg-red-50 border-b border-red-200">
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-red-100 ring-1 ring-red-200">
            <AlertTriangle className="h-4 w-4 text-red-700" />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-700/80"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              Zone de danger
            </p>
            <h3
              className="text-[15px] font-bold text-red-900 !mb-0"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              {t('account.delete.title', { default: 'Supprimer le compte' })}
            </h3>
          </div>
        </header>

        <div className="p-5">
          {!showDeleteConfirm ? (
            <div>
              <p className="text-[13px] text-ink-mute mb-4 leading-relaxed">
                {t('account.delete.warning', {
                  default:
                    'Une fois supprimé, votre compte est irréversible. Tous vos billets, commandes et données seront perdus.',
                })}
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center h-10 px-4 bg-red-600 hover:bg-red-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                {t('account.delete.button', { default: 'Supprimer mon compte' })}
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl2 p-4">
              <p className="text-[13px] font-bold text-red-900 mb-1">
                {t('account.delete.confirm_text', {
                  default: 'Pour confirmer, tapez « delete my account » ci-dessous.',
                })}
              </p>
              <p
                className="text-[11px] text-red-700/80 mb-3 tabular-nums"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              >
                Cette action est définitive.
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full h-11 px-3.5 bg-paper border border-red-300 text-ink rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 mb-4 placeholder:text-red-400"
                placeholder={t('account.delete.confirm_placeholder', {
                  default: 'Tapez « delete my account »',
                })}
              />
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmation('');
                  }}
                  className="inline-flex items-center justify-center h-10 px-4 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-ink hover:bg-cream/50 transition-colors"
                >
                  {t('account.delete.cancel', { default: 'Annuler' })}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmation.toLowerCase() !== 'delete my account'}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-red-600 hover:bg-red-700 text-paper rounded-lg text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-card"
                >
                  {loading ? (
                    <>
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      {t('account.delete.deleting', { default: 'Suppression...' })}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('account.delete.confirm_button', { default: 'Confirmer la suppression' })}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}