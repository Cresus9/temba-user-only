import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  Phone,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isValidPhone, getPhoneInfo, detectInputType } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import AuthShell from '../components/auth/AuthShell';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';

type SignupStep = 'form' | 'verify';
type SignupMethod = 'email' | 'phone';

// TEMPORARY: Disable OTP verification for phone signup while Twilio is being verified
const REQUIRE_OTP_FOR_PHONE_SIGNUP = false;

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-2';
const inputBase =
  'block w-full py-2.5 text-[14px] text-ink placeholder:text-ink-mute/70 bg-paper border border-line rounded-xl2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors disabled:opacity-60';

export default function SignUp() {
  const [step, setStep] = useState<SignupStep>('form');
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('phone');
  const [countryCode, setCountryCode] = useState('+226');
  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSendVerificationCode = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    if (!formData.emailOrPhone.trim()) {
      setError(
        signupMethod === 'email'
          ? 'Veuillez entrer votre adresse email'
          : 'Veuillez entrer votre numéro de téléphone'
      );
      return;
    }

    if (signupMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailOrPhone)) {
        setError('Veuillez entrer une adresse email valide');
        return;
      }
    } else if (signupMethod === 'phone') {
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      if (!isValidPhone(fullPhone)) {
        setError('Format de numéro invalide. Vérifiez le numéro saisi');
        return;
      }
    }

    if (!formData.password) {
      setError('Veuillez entrer un mot de passe');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (signupMethod === 'email') {
      await handleEmailSignup();
      return;
    }

    if (signupMethod === 'phone') {
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;

      if (!REQUIRE_OTP_FOR_PHONE_SIGNUP) {
        setIsLoading(true);
        try {
          await authService.register({
            name: formData.name,
            phone: fullPhone,
            password: formData.password,
          });
          toast.success('Compte créé avec succès !');
          navigate('/');
        } catch (err: any) {
          const message = err.message || 'Échec de la création du compte';
          setError(message);
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      setIsSendingOTP(true);
      try {
        await authService.sendOTP(fullPhone);
        setStep('verify');
        toast.success('Code de vérification envoyé par SMS !');
      } catch (err: any) {
        setError(err.message || "Échec de l'envoi du code");
        toast.error(err.message || "Échec de l'envoi du code");
      } finally {
        setIsSendingOTP(false);
      }
    }
  };

  const handleEmailSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      await register({
        name: formData.name,
        email: formData.emailOrPhone,
        password: formData.password,
      });
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (err: any) {
      const message = err.message || 'Échec de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndCreateAccount = async () => {
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Le code de vérification doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;

      const isValid = await authService.verifyOTP(fullPhone, otpCode);
      if (!isValid) {
        setError('Code invalide. Veuillez réessayer.');
        toast.error('Code invalide');
        setIsLoading(false);
        return;
      }

      await authService.registerWithPhone({
        name: formData.name,
        phone: fullPhone,
        password: formData.password,
      });

      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (err: any) {
      const message = err.message || 'Échec de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsSendingOTP(true);
    try {
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      await authService.sendOTP(fullPhone);
      toast.success('Code renvoyé avec succès !');
    } catch (err: any) {
      setError(err.message || "Échec de l'envoi du code");
      toast.error(err.message || "Échec de l'envoi du code");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const switchMethod = (m: SignupMethod) => {
    setSignupMethod(m);
    setFormData({ ...formData, emailOrPhone: '' });
    setError('');
    setCountryCode('+226');
  };

  /* ─────────────────────────────────────────────────
     OTP VERIFY STEP
  ───────────────────────────────────────────────── */
  if (step === 'verify') {
    const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
    const info = getPhoneInfo(fullPhone);
    const displayPhone = info?.normalized || fullPhone;

    return (
      <AuthShell
        eyebrow="Étape 2/2"
        title="Vérifiez votre numéro."
        subtitle={
          <>
            Nous avons envoyé un code à 6 chiffres au{' '}
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
        posterEyebrow="Sécurité · OTP"
        posterHeadline="Une dernière étape, et on y est."
        posterSub="Le code à 6 chiffres protège votre compte. À usage unique, valable 10 minutes."
        posterTagline="Plus que 6 chiffres"
      >
        {/* The shell's "backTo" is a Link — we override behavior with a button below */}
        <button
          type="button"
          onClick={() => {
            setStep('form');
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
            onClick={handleVerifyAndCreateAccount}
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
                Vérifier et créer le compte
              </>
            )}
          </button>

          <div className="mt-5 pt-5 border-t border-line space-y-3 text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isSendingOTP}
              className="block w-full text-[13px] font-semibold text-brand hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSendingOTP ? 'Envoi en cours...' : 'Renvoyer le code'}
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  /* ─────────────────────────────────────────────────
     SIGNUP FORM STEP
  ───────────────────────────────────────────────── */
  return (
    <>
      <PageSEO title="Créer un compte" description="Rejoignez Temba, la billetterie N°1 au Burkina Faso." robots="noindex, nofollow" />
    <AuthShell
      eyebrow="Inscription"
      title="Rejoignez la file."
      subtitle="Créez votre compte Temba en moins d'une minute. Vos billets vous attendent."
      illustration="party-2"
      posterEyebrow="Communauté · Burkina Faso"
      posterHeadline="Soyez les premiers prévenus."
      posterSub="Concerts, festivals, soirées culturelles — réservez avant tout le monde et invitez vos amis."
      posterTagline="Bienvenue à bord"
    >
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-[13px] leading-relaxed">{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendVerificationCode();
        }}
        className="space-y-5"
      >
        {/* Full Name */}
        <div>
          <label className={labelClass}>Nom complet</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`${inputBase} pl-10 pr-3`}
              placeholder="Aristide Yabre"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Method toggle */}
        <div>
          <p className={labelClass}>Méthode d'inscription</p>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-cream rounded-xl2 border border-line">
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                signupMethod === 'phone'
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
                signupMethod === 'email'
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
            {signupMethod === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
          </label>
          {signupMethod === 'phone' ? (
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
                  value={formData.emailOrPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d\s]/g, '');
                    setFormData({ ...formData, emailOrPhone: value });
                    setError('');
                  }}
                  className={`${inputBase} pl-10 pr-3 rounded-l-none tabular-nums`}
                  style={{ fontFamily: monoFamily }}
                  placeholder="70 12 34 56"
                  autoComplete="tel"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                type="email"
                value={formData.emailOrPhone}
                onChange={(e) => {
                  setFormData({ ...formData, emailOrPhone: e.target.value });
                  setError('');
                }}
                className={`${inputBase} pl-10 pr-3`}
                placeholder="nom@exemple.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {formData.emailOrPhone && (
            <div className="mt-2">
              {signupMethod === 'phone'
                ? (() => {
                    const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
                    const isValid = isValidPhone(fullPhone);
                    const info = isValid ? getPhoneInfo(fullPhone) : null;
                    return isValid && info ? (
                      <p className="text-[11px] text-brand flex items-center gap-1.5 font-semibold">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        Numéro valide{info.countryName ? ` · ${info.countryName}` : ''}
                        {REQUIRE_OTP_FOR_PHONE_SIGNUP ? ' · code SMS à venir' : ''}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-600 flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        Numéro invalide
                      </p>
                    );
                  })()
                : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone) ? (
                    <p className="text-[11px] text-brand flex items-center gap-1.5 font-semibold">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Email valide
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-600 flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-3 w-3" />
                      Format d'email invalide
                    </p>
                  )}
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className={labelClass}>Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`${inputBase} pl-10 pr-11`}
              placeholder="Au moins 8 caractères"
              required
              minLength={8}
              disabled={isLoading}
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

        {/* Confirm Password */}
        <div>
          <label className={labelClass}>Confirmer le mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className={`${inputBase} pl-10 pr-11`}
              placeholder="Retapez le mot de passe"
              required
              minLength={8}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3 w-3" />
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>

        {/* Terms hint */}
        <p className="text-[12px] text-ink-mute leading-relaxed">
          En créant un compte, vous acceptez nos{' '}
          <Link to="/terms" className="font-semibold text-brand hover:text-brand-700 transition-colors">
            conditions d'utilisation
          </Link>{' '}
          et notre{' '}
          <Link to="/privacy" className="font-semibold text-brand hover:text-brand-700 transition-colors">
            politique de confidentialité
          </Link>
          .
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isSendingOTP}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading || isSendingOTP ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              {isSendingOTP ? 'Envoi du code...' : 'Création du compte...'}
            </>
          ) : (
            <>
              {signupMethod === 'phone'
                ? REQUIRE_OTP_FOR_PHONE_SIGNUP
                  ? 'Envoyer le code de vérification'
                  : 'Créer le compte'
                : 'Créer le compte'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-6 pt-5 border-t border-line">
        <p className="text-center text-[13px] text-ink-mute">
          Vous avez déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-bold text-brand hover:text-brand-700 transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </AuthShell>
    </>
  );
}