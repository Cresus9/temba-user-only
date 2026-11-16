import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';
import AuthShell from '../components/auth/AuthShell';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check URL hash for Supabase error params (e.g. expired OTP)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlError = hashParams.get('error');
    const errorCode = hashParams.get('error_code');

    if (urlError === 'access_denied' && errorCode === 'otp_expired') {
      setError('Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.');
      return;
    }

    // Supabase exchanges the recovery token from the URL hash asynchronously.
    // We MUST use onAuthStateChange to catch PASSWORD_RECOVERY — calling
    // getSession() immediately will always return null before the exchange completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          // Token successfully exchanged — user can now set a new password.
          setIsValidToken(true);
          return;
        }

        // If the user already has a valid session (e.g. navigated here while
        // logged in), allow them to change their password directly.
        if (event === 'SIGNED_IN' && session) {
          setIsValidToken(true);
          return;
        }

        // Token present in URL but exchange failed or no recovery event fired
        // after a short grace period — treat as invalid link.
      }
    );

    // Fallback: if there is already an active session when the page loads
    // (e.g. the Supabase client already processed the hash on init),
    // getSession() will return it synchronously.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsValidToken(true);
    });

    // If after 5 s nothing has fired, the link is invalid/expired.
    const timeout = setTimeout(() => {
      setIsValidToken((prev) => {
        if (!prev) setError('Lien de réinitialisation invalide ou expiré.');
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      await authService.updatePassword(password);
      setIsSuccess(true);
      toast.success('Mot de passe mis à jour avec succès !');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Erreur de mise à jour du mot de passe:', error);
      setError(error.message || 'Échec de la mise à jour du mot de passe');
      toast.error(error.message || 'Échec de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && !error) {
    return (
      <AuthShell title="Nouveau mot de passe" subtitle="Vérification du lien de réinitialisation.">
        <PageSEO title="Nouveau mot de passe" description="Définissez un nouveau mot de passe pour votre compte Temba." robots="noindex, nofollow" />
        <div className="flex items-center gap-3 text-[14px] text-ink-2">
          <Loader className="h-5 w-5 animate-spin text-brand" />
          Vérification du lien…
        </div>
      </AuthShell>
    );
  }

  if (error && !isValidToken) {
    return (
      <AuthShell
        title={error.includes('expiré') ? 'Lien expiré' : 'Lien invalide'}
        subtitle={error}
        backTo="/login"
        backLabel="Retour à la connexion"
      >
        <PageSEO title="Nouveau mot de passe" robots="noindex, nofollow" />
        <div className="space-y-3">
          <Link to="/forgot-password" className="btn btn-primary h-12 w-full">
            Demander un nouveau lien
          </Link>
          <Link to="/login" className="btn btn-secondary h-12 w-full">
            Retour à la connexion
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choisissez un nouveau mot de passe"
      subtitle="Il remplace l’ancien sur le site et dans l’app Temba."
      backTo="/login"
      backLabel="Retour à la connexion"
    >
      <PageSEO title="Nouveau mot de passe" description="Définissez un nouveau mot de passe pour votre compte Temba." robots="noindex, nofollow" />
      {isSuccess ? (
        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[#0B7A52]" />
          <h2 className="font-display text-[20px] font-bold">Mot de passe mis à jour</h2>
          <p className="mt-2 text-[14px] text-ink-2">Redirection vers la connexion…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[14px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-12 text-[15px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="••••••••"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[12px] text-ink-3">8 caractères minimum.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Confirmer</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-12 text-[15px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary h-12 w-full">
            {isLoading ? 'Mise à jour…' : 'Enregistrer et me connecter'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
