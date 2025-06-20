import React, { useState } from 'react';
import { Shield, Key, AlertTriangle, Loader } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('account.settings.title', { default: 'Account Settings' })}
      </h1>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t('account.password.title', { default: 'Change Password' })}
          </h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('account.password.current', { default: 'Current Password' })}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('account.password.new', { default: 'New Password' })}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('account.password.confirm', { default: 'Confirm New Password' })}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                {t('account.password.updating', { default: 'Updating...' })}
              </>
            ) : (
              t('account.password.update', { default: 'Update Password' })
            )}
          </button>
        </form>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t('account.security.title', { default: 'Security Settings' })}
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {t('account.security.2fa.title', { default: 'Two-Factor Authentication' })}
              </p>
              <p className="text-sm text-gray-600">
                {t('account.security.2fa.description', { default: 'Add an extra layer of security to your account' })}
              </p>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {t('account.security.2fa.enable', { default: 'Enable' })}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {t('account.security.login_history.title', { default: 'Login History' })}
              </p>
              <p className="text-sm text-gray-600">
                {t('account.security.login_history.description', { default: 'View your recent login activity' })}
              </p>
            </div>
            <button
              onClick={() => setShowLoginHistory(!showLoginHistory)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {showLoginHistory 
                ? t('account.security.login_history.hide', { default: 'Hide History' })
                : t('account.security.login_history.view', { default: 'View History' })
              }
            </button>
          </div>
          {showLoginHistory && (
            <div className="mt-4">
              <LoginHistory />
            </div>
          )}
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t('account.delete.title', { default: 'Delete Account' })}
          </h2>
        </div>
        {!showDeleteConfirm ? (
          <div>
            <p className="text-gray-600 mb-4">
              {t('account.delete.warning', { default: 'Once you delete your account, there is no going back. Please be certain.' })}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t('account.delete.button', { default: 'Delete Account' })}
            </button>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-700 font-medium mb-4">
              {t('account.delete.confirm_text', { default: 'Please type "delete my account" to confirm deletion' })}
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              placeholder={t('account.delete.confirm_placeholder', { default: 'Type "delete my account"' })}
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('account.delete.cancel', { default: 'Cancel' })}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmation.toLowerCase() !== 'delete my account'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    {t('account.delete.deleting', { default: 'Deleting...' })}
                  </>
                ) : (
                  t('account.delete.confirm_button', { default: 'Confirm Delete' })
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}