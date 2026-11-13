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
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';
import { useEvents } from '../context/EventContext';
import { eventPublicPath } from '../utils/eventPath';
import { shortPlace } from '../utils/eventGeo';
import { calendarDayInZone, formatCalendarDate } from '../utils/formatters';
import Logo from '../components/brand/Logo';
import { eventPricePresentation } from '../utils/labels';

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
  const { events } = useEvents();
  const nextEvent = [...events]
    .filter((event) => !event.is_permanent && (event.date || '').split('T')[0] >= calendarDayInZone())
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as any;
  const from =
    state?.redirectTo ||
    (typeof state?.from === 'string' ? state.from : state?.from?.pathname) ||
    '/dashboard';
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

      navigate(from, { replace: true, state: state?.checkoutData || undefined });
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
    <>
      <PageSEO title="Se connecter" description="Connexion à votre compte Temba." robots="noindex, nofollow" />
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_46%]">
      <div className="relative h-[200px] overflow-hidden bg-ink lg:hidden">
        <img src="/photos/awa-sissao-lg.jpg" alt="Awa Sissao en concert" className="absolute inset-0 h-full w-full object-cover object-[28%_35%]" />
        <p className="absolute bottom-2 left-4 right-4 text-[11px] text-white/80">Awa Sissao, 2023 · La Cour du Naaba, CC BY-SA 4.0</p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Temba — accueil"><Logo size={26} /></Link>
          <Link to="/events" className="text-[14px] font-medium text-ink-2">Voir les événements</Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-tight md:text-[44px]">Retrouvez<br />vos billets.</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-2">Connectez-vous avec le numéro utilisé lors de votre achat.</p>
      {/* Error banner */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl2 flex items-start gap-2.5 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-[13px] leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <label htmlFor="password" className="mb-1.5 flex items-center justify-between text-[14px] font-semibold">
            <span>Mot de passe</span>
            <Link to="/forgot-password" className="text-[14px] font-semibold text-brand">Mot de passe oublié ?</Link>
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
        <button
          type="button"
          onClick={() => switchMethod(loginMethod === 'phone' ? 'email' : 'phone')}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-line text-[15px] font-semibold"
        >
          {loginMethod === 'phone' ? 'Utiliser mon e-mail' : 'Utiliser mon téléphone'}
        </button>
      </form>

      <p className="mt-5 text-[15px] text-ink-2">
        Pas encore de compte ?{' '}
        <Link to="/signup" state={state?.redirectTo ? { redirectTo: state.redirectTo, checkoutData: state.checkoutData } : undefined} className="font-semibold text-brand">Créer un compte</Link>
      </p>
      <p className="mt-6 border-t border-line pt-4 text-[14px] text-ink-2">
        Acheté sans compte ? <Link to="/find-tickets" className="font-semibold text-ink underline">Retrouvez vos billets avec votre numéro</Link>.
      </p>
        </div>
        <p className="mt-8 flex flex-wrap gap-4 text-[12.5px] text-ink-3">
          <span>Billets vendus par les organisateurs, au prix officiel</span>
          <span>Aide : +226 74 75 08 15</span>
        </p>
      </div>
      <aside className="relative hidden min-h-screen overflow-hidden bg-ink lg:block">
        <img src="/photos/awa-sissao-lg.jpg" alt="Awa Sissao en concert" className="absolute inset-0 h-full w-full object-cover object-[30%_40%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#03061E]/80 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          {nextEvent && (
            <Link to={eventPublicPath(nextEvent)} className="mb-4 flex max-w-[430px] items-center gap-3 rounded-xl bg-white p-3 text-ink shadow-lg">
              {nextEvent.image_url ? <img src={nextEvent.image_url} alt="" className="h-16 w-[52px] rounded-md object-cover" /> : null}
              <span>
                <span className="block text-[12.5px] font-semibold text-brand">Prochainement · {formatCalendarDate(nextEvent.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="mt-0.5 block font-display text-[16px] font-bold">{nextEvent.title}</span>
                <span className="mt-0.5 block text-[13px] text-ink-3">{shortPlace(nextEvent.location, nextEvent.city).label} · {eventPricePresentation(nextEvent).label}</span>
              </span>
            </Link>
          )}
          <p className="max-w-md text-[12px] text-white/80">Awa Sissao en concert, 2023 · Photo La Cour du Naaba, CC BY-SA 4.0, Wikimedia Commons</p>
        </div>
      </aside>
    </div>
    </>
  );
}
