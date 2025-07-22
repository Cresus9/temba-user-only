import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService, Profile } from '../../services/userService';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

export default function ProfileInfo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: ''
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await userService.getProfile();
      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          bio: profileData.bio || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error(t('profile.error.load', { default: 'Failed to load profile' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.updateProfile(formData);
      toast.success(t('profile.success.update', { default: 'Profile updated successfully' }));
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.error.update', { default: 'Failed to update profile' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--gray-600)]">
          {t('profile.error.try_again', { default: 'Profile not found. Please try refreshing the page.' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">
          {t('profile.info.title', { default: 'Profile Information' })}
        </h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 text-sm font-medium text-[var(--primary-600)] hover:text-[var(--primary-700)]"
        >
          {isEditing 
            ? t('profile.info.cancel', { default: 'Cancel' })
            : t('profile.info.edit', { default: 'Edit Profile' })
          }
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.fields.name', { default: 'Full Name' })}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.fields.email', { default: 'Email Address' })}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={true}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.fields.phone', { default: 'Phone Number' })}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:bg-gray-50"
              placeholder={t('profile.fields.phone.placeholder', { default: '+226 XX XX XX XX' })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.fields.location', { default: 'Location' })}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:bg-gray-50"
              placeholder={t('profile.fields.location.placeholder', { default: 'City, Country' })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.fields.bio', { default: 'Bio' })}
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={!isEditing}
              rows={4}
              className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] disabled:bg-gray-50"
              placeholder={t('profile.fields.bio.placeholder', { default: 'Tell us about yourself...' })}
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 border border-[var(--gray-200)] rounded-lg text-gray-700 hover:bg-[var(--gray-50)]"
            >
              {t('profile.info.cancel', { default: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4" />
                  <span>{t('profile.info.saving', { default: 'Saving...' })}</span>
                </>
              ) : (
                t('profile.info.save', { default: 'Save Changes' })
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
