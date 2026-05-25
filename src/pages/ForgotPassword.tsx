import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Loader,
  CheckCircle2,
  AlertCircle,
  Phone,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Check,
} from 'lucide-react';
import { authService } from '../services/authService';
import { isValidPhone, getPhoneInfo } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import AuthShell from '../components/auth/AuthShell';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';

type ResetStep = 'input' | 'verify-otp' | 'reset-password' | 'success';
type ResetMethod = 'email' | 'phone';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-2';
const inputBase =
  'block w-full py-2.5 text-[14px] text-ink placeholder:text-ink-mute/70 bg-paper border border-line rounded-xl2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors disabled:opacity-60';

export default function ForgotPassword() {
  const [step, setStep] = useState<ResetStep>('input');
  const [resetMethod, setResetMethod] = useState<ResetMethod>('phone');
  const [countryCode, setCountryCode] = useState('+226');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone.trim()) {
      setError(
        resetMethod === 'email'
          ? 'Veuillez entrer votre adresse email'
          : 'Veuillez entrer votre numéro de téléphone'
      );
      return;
    }

    if (resetMethod === 'email') {
      setIsLoading(true);
      try {
        await authService.resetPassword(emailOrPhone);
        setStep('success');
        toast.success('Instructions de réinitialisation envoyées à votre email');
      } catch (err: any) {
        setError(err.message || "Échec de l'envoi des instructions");
        toast.error(err.message || "Échec de l'envoi des instructions");
      } finally {
        setIsLoading(false);
      }
    } else {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      if (!isValidPhone(fullPhone)) {
        setError('Format de numéro invalide');
        return;
      }
      setIsSendingOTP(true);
      try {
        await authService.sendOTP(fullPhone);
        setStep('verify-otp');
        toast.success('Code de vérification envoyé par SMS !');
      } catch (err: any) {
        setError(err.message || "Échec de l'envoi du code");
        toast.error(err.message || "Échec de l'envoi du code");
      } finally {
        setIsSendingOTP(false);
      }
    }
  };

  const handleVerifyOTP = async () => {
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Le code de vérification doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      const isValid = await authService.verifyOTP(fullPhone, otpCode);

      if (!isValid) {
        setError('Code invalide. Veuillez réessayer.');
        toast.error('Code invalide');
        setIsLoading(false);
        return;
      }

      setStep('reset-password');
      toast.success('Code vérifié !');
    } catch (err: any) {
      setError(err.message || 'Échec de la vérification du code');
      toast.error(err.message || 'Échec de la vérification du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      await authService.resetPasswordWithPhone(fullPhone, newPassword, otpCode);
      setStep('success');
      toast.success('Mot de passe réinitialisé !');
    } catch (err: any) {
      setError(err.message || 'Échec de la réinitialisation du mot de passe');
      toast.error(err.message || 'Échec de la réinitialisation du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsSendingOTP(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      await authService.sendOTP(fullPhone);
      toast.success('Code renvoyé !');
    } catch (err: any) {
      setError(err.message || "Échec de l'envoi du code");
      toast.error(err.message || "Échec de l'envoi du code");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const switchMethod = (m: ResetMethod) => {
    setResetMethod(m);
    setEmailOrPhone('');
    setError('');
    if (m === 'phone') setCountryCode('+226');
  };

  /* ─────────────────────────────────────────────────
     SUCCESS
  ───────────────────────────────────────────────── */
  if (step === 'success') {
    return (
      <AuthShell
        eyebrow={resetMethod === 'email' ? 'Email envoyé' : 'Mot de passe restauré'}
        title={
          resetMethod === 'email' ? 'Vérifiez votre email.' : 'Tout est rentré dans l’ordre.'
        }
        subtitle={
          resetMethod === 'email' ? (
            <>
              Nous avons envoyé un lien de réinitialisation à{' '}
              <span className="font-bold text-ink">{emailOrPhone}</span>. Cliquez sur le lien
              pour définir un nouveau mot de passe.
            </>
          ) : (
            'Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.'
          )
        }
        illustration="party"
        posterEyebrow="Mission accomplie"
        posterHeadline="Tout est rentré dans l'ordre."
        posterSub="Votre compte est sécurisé. Vous pouvez retrouver vos billets et vos commandes."
        posterTagline="Bon retour"
      >
        <div className="bg-paper rounded-xl2 border border-line shadow-card p-6 sm:p-8 text-center">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-green-50 ring-2 ring-green-200 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-green-600" strokeWidth={2.5} />
          </div>
          <p className="text-[14px] text-ink leading-relaxed mb-6">
            {resetMethod === 'email'
              ? "Vérifiez votre boîte de réception (et le dossier spam) pour le lien de réinitialisation."
              : 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'}
          </p>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card"
          >
            Aller à la connexion
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  /* ─────────────────────────────────────────────────
     OTP VERIFY
  ───────────────────────────────────────────────── */
  if (step === 'verify-otp') {
    const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
    const info = getPhoneInfo(fullPhone);
    const displayPhone = info?.normalized || fullPhone;

    return (
      <AuthShell
        eyebrow="Étape 1/2 — Vérification"
        title="Entrez le code reçu."
        subtitle={
          <>
            Code à 6 chiffres envoyé au{' '}
            <span
              className="font-bold text-ink tabular-nums"
              style={{ fontFamily: monoFamily }}
            >
              {displayPhone}
            </span>
            .
          </>
        }
        illustration="living-room"
        posterEyebrow="Vérification SMS"
        posterHeadline="Un petit code, c'est tout."
        posterSub="6 chiffres pour confirmer que c'est bien vous. Le code est valable 10 minutes."
        posterTagline="Sécurité d'abord"
      >
        <button
          type="button"
          onClick={() => {
            setStep('input');
            setOtpCode('');
            setError('');
          }}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-4 -mt-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Modifier le numéro
        </button>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-[13px] leading-relaxed">{error}</span>
          </div>
        )}

        <div className="bg-paper rounded-xl2 border border-line shadow-card p-6 sm:p-7">
          <label className={labelClass}>Code de vérification</label>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtpCode(value);
              setError('');
            }}
            className="w-full px-4 py-4 border border-line rounded-xl2 bg-cream/40 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-paper text-center text-[28px] tracking-[0.4em] font-bold text-ink tabular-nums"
            style={{ fontFamily: monoFamily }}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={isLoading || otpCode.length !== 6}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Vérifier le code
              </>
            )}
          </button>

          <div className="mt-5 pt-5 border-t border-line text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isSendingOTP}
              className="text-[13px] font-semibold text-brand hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSendingOTP ? 'Envoi en cours...' : 'Renvoyer le code'}
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  /* ─────────────────────────────────────────────────
     RESET PASSWORD
  ───────────────────────────────────────────────── */
  if (step === 'reset-password') {
    return (
      <AuthShell
        eyebrow="Étape 2/2 — Nouveau mot de passe"
        title="Choisissez un nouveau mot de passe."
        subtitle="Au moins 8 caractères. Évitez les mots simples ou répétés."
        illustration="party-2"
        posterEyebrow="Sécurité du compte"
        posterHeadline="Choisissez quelque chose de mémorable."
        posterSub="8 caractères minimum. Mélangez lettres, chiffres et symboles — et gardez-le pour Temba uniquement."
        posterTagline="Nouveau départ"
      >
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-[13px] leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className={labelClass}>Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                className={`${inputBase} pl-10 pr-11`}
                placeholder="Au moins 8 caractères"
                required
                minLength={8}
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className={`${inputBase} pl-10 pr-3`}
                placeholder="Retapez le mot de passe"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-3 w-3" />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
              <p className="mt-2 text-[11px] text-brand flex items-center gap-1.5 font-semibold">
                <Check className="h-3 w-3" strokeWidth={3} />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Réinitialisation...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Réinitialiser le mot de passe
              </>
            )}
          </button>
        </form>
      </AuthShell>
    );
  }

  /* ─────────────────────────────────────────────────
     INPUT
  ───────────────────────────────────────────────── */
  return (
    <>
      <PageSEO title="Mot de passe oublié" description="Réinitialisez votre mot de passe Temba." robots="noindex, nofollow" />
    <AuthShell
      eyebrow="Récupération du compte"
      title="Mot de passe oublié ?"
      subtitle="On va régler ça en deux étapes. Entrez votre email ou votre numéro pour recevoir un code de récupération."
      backTo="/login"
      backLabel="Retour à la connexion"
      illustration="living-room"
      posterEyebrow="Pas de panique"
      posterHeadline="Ça arrive aux meilleurs."
      posterSub="Récupération en deux étapes : un code de vérification, puis un nouveau mot de passe. Moins d'une minute."
      posterTagline="On vous remet en selle"
    >
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-[13px] leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Method toggle */}
        <div>
          <p className={labelClass}>Méthode de récupération</p>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-cream rounded-xl2 border border-line">
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                resetMethod === 'phone'
                  ? 'bg-paper text-brand shadow-card ring-1 ring-line'
                  : 'text-ink-mute hover:text-ink'
              }`}
            >
              <Phone className="h-4 w-4" />
              Téléphone
            </button>
            <button
              type="button"
              onClick={() => switchMethod('email')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                resetMethod === 'email'
                  ? 'bg-paper text-brand shadow-card ring-1 ring-line'
                  : 'text-ink-mute hover:text-ink'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
          </div>
        </div>

        {/* Email or Phone input */}
        <div>
          <label className={labelClass}>
            {resetMethod === 'phone' ? 'Numéro de téléphone' : 'Adresse email'}
          </label>
          {resetMethod === 'phone' ? (
            <div className="flex">
              <CountryCodeSelector
                value={countryCode}
                onChange={(code) => {
                  setCountryCode(code);
                  setError('');
                }}
              />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                <input
                  type="tel"
                  value={emailOrPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d\s]/g, '');
                    setEmailOrPhone(value);
                    setError('');
                  }}
                  className={`${inputBase} pl-10 pr-3 rounded-l-none tabular-nums`}
                  style={{ fontFamily: monoFamily }}
                  placeholder="70 12 34 56"
                  autoComplete="tel"
                  required
                  disabled={isLoading || isSendingOTP}
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                type="email"
                value={emailOrPhone}
                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
                  setError('');
                }}
                className={`${inputBase} pl-10 pr-3`}
                placeholder="nom@exemple.com"
                required
                disabled={isLoading || isSendingOTP}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isSendingOTP}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading || isSendingOTP ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              {isSendingOTP ? 'Envoi du code...' : 'Envoi en cours...'}
            </>
          ) : (
            <>
              {resetMethod === 'phone'
                ? 'Envoyer le code de vérification'
                : 'Envoyer les instructions'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Security strip */}
      <p
        className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute/70"
        style={{ fontFamily: monoFamily }}
      >
        🔒 Vos données restent privées · Aucun mot de passe stocké en clair
      </p>
    </AuthShell>
    </>
  );
}