import React, { useState, useEffect } from 'react';
import { Loader, Pencil, Lock, Check } from 'lucide-react';
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
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
          <Loader className="h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-ink-mute">
          {t('profile.error.try_again', { default: 'Profile not found. Please try refreshing the page.' })}
        </p>
      </div>
    );
  }

  const inputClass = (locked: boolean) =>
    `w-full h-11 px-3.5 border rounded-lg text-[14px] text-ink placeholder:text-ink-mute/60 transition-shadow ${
      locked
        ? 'bg-cream border-line cursor-not-allowed text-ink/70'
        : 'bg-paper border-line focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15'
    }`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-line">
        <div className="min-w-0">
          <p className="eyebrow !mb-1">Compte</p>
          <h1
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {t('profile.info.title', { default: 'Informations du profil' })}
          </h1>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-brand/40 hover:text-brand transition-colors flex-shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('profile.info.edit', { default: 'Modifier' })}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              {t('profile.fields.name', { default: 'Nom complet' })}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className={inputClass(!isEditing)}
              required
            />
          </div>

          {/* Email — always locked */}
          <div>
            <label className="flex items-center justify-between text-[12px] font-semibold text-ink mb-1.5">
              <span>{t('profile.fields.email', { default: 'Adresse email' })}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute">
                <Lock className="h-2.5 w-2.5" />
                Verrouillé
              </span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={true}
              className={inputClass(true)}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              {t('profile.fields.phone', { default: 'Numéro de téléphone' })}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
              className={`${inputClass(!isEditing)} tabular-nums`}
              placeholder={t('profile.fields.phone.placeholder', { default: '+226 XX XX XX XX' })}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              {t('profile.fields.location', { default: 'Localisation' })}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={!isEditing}
              className={inputClass(!isEditing)}
              placeholder={t('profile.fields.location.placeholder', { default: 'Ville, Pays' })}
            />
          </div>

          {/* Bio */}
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              {t('profile.fields.bio', { default: 'À propos de vous' })}
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={!isEditing}
              rows={4}
              className={`w-full px-3.5 py-2.5 border rounded-lg text-[14px] text-ink placeholder:text-ink-mute/60 transition-shadow leading-relaxed resize-none ${
                !isEditing
                  ? 'bg-cream border-line cursor-not-allowed text-ink/70'
                  : 'bg-paper border-line focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15'
              }`}
              placeholder={t('profile.fields.bio.placeholder', { default: 'Quelques mots sur vous, vos goûts, vos événements préférés…' })}
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center justify-center h-10 px-5 border border-line bg-paper text-ink rounded-lg text-[13px] font-medium hover:border-brand/40 hover:bg-cream transition-colors"
            >
              {t('profile.info.cancel', { default: 'Annuler' })}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold disabled:opacity-50 transition-colors shadow-card"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4" />
                  <span>{t('profile.info.saving', { default: 'Enregistrement…' })}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  {t('profile.info.save', { default: 'Enregistrer les modifications' })}
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}