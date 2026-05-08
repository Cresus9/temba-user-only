import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Phone,
  Loader,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { detectInputType, getPhoneInfo, isValidPhone } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import AuthShell from '../components/auth/AuthShell';
import toast from 'react-hot-toast';

type LoginMethod = 'email' | 'phone';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-2';
const inputBase =
  'block w-full py-2.5 text-[14px] text-ink placeholder:text-ink-mute/70 bg-paper border border-line rounded-xl2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors disabled:opacity-60';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [countryCode, setCountryCode] = useState('+226');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as any;
  const from = state?.redirectTo || state?.from?.pathname || '/dashboard';
  const prefilledEmail = state?.email || '';

  React.useEffect(() => {
    if (prefilledEmail) {
      setEmailOrPhone(prefilledEmail);
      if (prefilledEmail.includes('@')) {
        setLoginMethod('email');
      }
    } else {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPhone = localStorage.getItem('rememberedPhone');

      if (rememberedEmail) {
        setEmailOrPhone(rememberedEmail);
        setLoginMethod('email');
        setRememberMe(true);
      } else if (rememberedPhone) {
        const phoneInfo = getPhoneInfo(rememberedPhone);
        if (phoneInfo.countryCode && phoneInfo.localNumber) {
          setCountryCode(`+${phoneInfo.countryCode}`);
          setEmailOrPhone(phoneInfo.localNumber);
          setLoginMethod('phone');
          setRememberMe(true);
        }
      }
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone.trim()) {
      setError('Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    if (loginMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOrPhone)) {
        setError('Veuillez entrer une adresse email valide');
        return;
      }
    } else if (loginMethod === 'phone') {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      if (!isValidPhone(fullPhone)) {
        setError('Format de numéro invalide. Vérifiez le numéro saisi');
        return;
      }
    }

    setIsLoading(true);

    try {
      const loginValue =
        loginMethod === 'phone'
          ? `${countryCode}${emailOrPhone.replace(/\s/g, '')}`
          : emailOrPhone;

      await login(loginValue, password);

      if (rememberMe) {
        if (loginMethod === 'email') {
          localStorage.setItem('rememberedEmail', emailOrPhone);
        } else {
          const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
          localStorage.setItem('rememberedPhone', fullPhone);
        }
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPhone');
      }

      navigate(from, { replace: true });
      toast.success('Connexion réussie !');
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      const errorMsg = err.message || 'Email/téléphone ou mot de passe invalide';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMethod = (m: LoginMethod) => {
    setLoginMethod(m);
    setEmailOrPhone('');
    setError('');
    if (m === 'phone') setCountryCode('+226');
  };

  return (
    <AuthShell
      eyebrow="Espace client"
      title="Bon retour."
      subtitle="Connectez-vous pour retrouver vos billets, vos commandes et vos transferts."
      illustration="party"
      posterEyebrow="Tickets · 226"
      posterHeadline="On vous attendait."
      posterSub="Retrouvez vos billets, vos commandes et vos transferts — tout est resté à sa place."
      posterTagline="La file est ouverte"
    >
      {/* Error banner */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-[13px] leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Method segmented toggle */}
        <div>
          <p className={labelClass}>Méthode de connexion</p>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-cream rounded-xl2 border border-line">
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                loginMethod === 'phone'
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
                loginMethod === 'email'
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
          <label htmlFor="emailOrPhone" className={labelClass}>
            {loginMethod === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
          </label>
          {loginMethod === 'phone' ? (
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
                  id="emailOrPhone"
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
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                id="emailOrPhone"
                type="email"
                value={emailOrPhone}
                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
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

          {/* Validation hint */}
          {emailOrPhone && (
            <div className="mt-2">
              {loginMethod === 'phone'
                ? (() => {
                    const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
                    const isValid = isValidPhone(fullPhone);
                    const info = isValid ? getPhoneInfo(fullPhone) : null;
                    return isValid && info ? (
                      <p className="text-[11px] text-brand flex items-center gap-1.5 font-semibold">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        Numéro valide{info.countryName ? ` · ${info.countryName}` : ''}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-600 flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        Numéro invalide
                      </p>
                    );
                  })()
                : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone) ? (
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
          <label htmlFor="password" className={labelClass}>
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} pl-10 pr-11`}
              placeholder="••••••••"
              required
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

        {/* Remember me + forgot */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-brand focus:ring-brand border-line rounded"
            />
            <span className="text-[13px] text-ink">Se souvenir de moi</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-[13px] font-semibold text-brand hover:text-brand-700 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl2 text-[14px] font-bold text-paper bg-brand hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            <>
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-6 pt-5 border-t border-line">
        <p className="text-center text-[13px] text-ink-mute">
          Pas encore de compte ?{' '}
          <Link
            to="/signup"
            className="font-bold text-brand hover:text-brand-700 transition-colors"
          >
            Créer un compte
          </Link>
        </p>
      </div>

      {/* Tiny security strip */}
      <p
        className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute/70"
        style={{ fontFamily: monoFamily }}
      >
        🔒 Connexion chiffrée · Vos données restent privées
      </p>
    </AuthShell>
  );
}
