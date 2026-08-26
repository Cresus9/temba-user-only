import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Loader, Mail, MessageCircle, Phone, Smartphone, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';
import CountryCodeSelector from '../components/CountryCodeSelector';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isValidPhone, normalizePhone } from '../utils/phoneValidation';
import { parseLocalDate } from '../utils/formatters';
import {
  SKIP_GUEST_TICKET_OTP,
  guestTicketsPath,
  listGuestWallets,
  lookupGuestTickets,
  persistGuestWallet,
  previewsForTokens,
  sendGuestRecoveryEmail,
  walletsForEmail,
  walletsForPhone,
  type RecoveredOrder,
} from '../services/guestTicketService';

type Channel = 'phone' | 'email';
type Step = 'identify' | 'otp' | 'results';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-2';
const inputBase =
  'block w-full py-2.5 text-[14px] text-ink placeholder:text-ink-mute/70 bg-paper border border-line rounded-xl2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors';

function formatEventDate(raw?: string) {
  if (!raw) return '';
  try {
    return parseLocalDate(raw).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
}

function OrderCard({
  order,
  onOpen,
}: {
  order: RecoveredOrder;
  onOpen: (token: string) => void;
}) {
  const code = (order.orderId || order.token).slice(0, 8).toUpperCase();
  return (
    <button
      type="button"
      onClick={() => onOpen(order.token)}
      className="w-full text-left rounded-xl2 border border-line bg-paper p-4 hover:border-brand hover:shadow-card transition-all"
    >
      <p className="eyebrow !mb-1">ORD · {code}</p>
      <p className="text-[15px] font-bold text-ink leading-snug">
        {order.eventTitle || 'Billets Temba'}
      </p>
      <p className="text-[13px] text-ink-mute mt-1">
        {formatEventDate(order.eventDate)}
        {order.ticketCount > 0
          ? `${formatEventDate(order.eventDate) ? ' · ' : ''}${order.ticketCount} billet${order.ticketCount > 1 ? 's' : ''}`
          : `${formatEventDate(order.eventDate) ? ' · ' : ''}QR en préparation`}
      </p>
      <span className="inline-flex items-center gap-1 mt-3 text-[13px] font-bold text-brand">
        Voir les billets
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

export default function FindGuestTickets() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>('phone');
  const [step, setStep] = useState<Step>('identify');
  const [countryCode, setCountryCode] = useState('+226');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [deviceOrders, setDeviceOrders] = useState<RecoveredOrder[]>([]);
  const [results, setResults] = useState<RecoveredOrder[]>([]);

  const fullPhone = `${countryCode}${localNumber.replace(/\s/g, '')}`;

  useEffect(() => {
    const tokens = listGuestWallets().map(w => w.token);
    if (!tokens.length) {
      setDeviceOrders([]);
      return;
    }
    let cancelled = false;
    previewsForTokens(tokens).then(rows => {
      if (!cancelled) setDeviceOrders(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [step, results.length]);

  if (isAuthenticated) return <Navigate to="/profile/my-tickets" replace />;

  const openToken = (token: string, extra?: { orderId?: string; email?: string; phone?: string }) => {
    if (extra?.orderId) {
      persistGuestWallet({
        token,
        orderId: extra.orderId,
        email: extra.email,
        phone: extra.phone,
      });
    }
    navigate(guestTicketsPath(token));
  };

  const showTokens = async (tokens: string[], fallbackMessage: string, ready?: RecoveredOrder[]) => {
    if (!tokens.length) {
      toast.error(fallbackMessage);
      return;
    }
    const previews = ready?.length ? ready.filter(p => tokens.includes(p.token)) : await previewsForTokens(tokens);
    previews.forEach(p => {
      if (p.orderId) {
        persistGuestWallet({
          token: p.token,
          orderId: p.orderId,
          email: channel === 'email' ? email.trim() : undefined,
          phone: channel === 'phone' ? normalizePhone(fullPhone) : undefined,
        });
      }
    });
    if (previews.length === 1) {
      openToken(previews[0].token, { orderId: previews[0].orderId, email: email.trim() || undefined, phone: channel === 'phone' ? fullPhone : undefined });
      return;
    }
    setResults(previews);
    setStep('results');
  };

  const switchChannel = (next: Channel) => {
    setChannel(next);
    setStep('identify');
    setCode('');
  };

  const sendCode = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setBusy(true);
    try {
      if (channel === 'phone') {
        if (!isValidPhone(fullPhone)) {
          toast.error('Numéro invalide');
          return;
        }
      } else {
        if (!EMAIL_RE.test(email.trim())) {
          toast.error("Format d'email invalide");
          return;
        }
      }

      if (SKIP_GUEST_TICKET_OTP) {
        const { tokens, previews, error } = await lookupGuestTickets(
          channel === 'email' ? { email: email.trim() } : { phone: fullPhone },
        );
        await showTokens(
          tokens,
          error || (channel === 'email' ? 'Aucun billet pour cet e-mail' : 'Aucun billet pour ce numéro'),
          previews,
        );
        return;
      }

      if (channel === 'phone') {
        const local = walletsForPhone(normalizePhone(fullPhone));
        try {
          await authService.sendOTP(fullPhone);
          setStep('otp');
          toast.success('Code envoyé par SMS');
        } catch (err: any) {
          if (local.length) {
            await showTokens(local.map(w => w.token), err.message);
            return;
          }
          toast.error(err.message || "Impossible d'envoyer le SMS. Essayez avec l'email.");
        }
        return;
      }

      const trimmed = email.trim();
      const local = walletsForEmail(trimmed);
      try {
        await sendGuestRecoveryEmail(trimmed);
        setStep('otp');
        toast.success('Code envoyé par e-mail');
      } catch (err: any) {
        if (local.length) {
          await showTokens(local.map(w => w.token), err.message);
          return;
        }
        toast.error(err.message || "Impossible d'envoyer l'e-mail. Essayez avec le téléphone.");
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { tokens, previews, error } = await lookupGuestTickets(
        channel === 'email'
          ? { email: email.trim(), code }
          : { phone: fullPhone, code },
      );
      await showTokens(
        tokens,
        error || (channel === 'email' ? 'Aucun billet pour cet e-mail' : 'Aucun billet pour ce numéro'),
        previews,
      );
    } catch (err: any) {
      toast.error(err.message || 'Vérification échouée');
    } finally {
      setBusy(false);
    }
  };

  const destinationLabel =
    channel === 'email'
      ? email.trim()
      : `${countryCode} ${localNumber}`.trim();

  return (
    <div className="min-h-[80vh] bg-cream bg-grain">
      <PageSEO
        title="Retrouver mes billets"
        description="Retrouvez vos billets Temba achetés sans compte, avec votre téléphone ou votre e-mail."
        robots="noindex, nofollow"
      />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand/10 grid place-items-center">
            <Ticket className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="eyebrow !mb-0.5">Sans compte</p>
            <h1
              className="text-[20px] font-extrabold text-ink"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              Retrouver mes billets
            </h1>
          </div>
        </div>

        <p className="text-[14px] text-ink-mute mb-6 leading-relaxed">
          {SKIP_GUEST_TICKET_OTP
            ? 'Orange/Moov : le numéro du paiement. Carte : e-mail ou téléphone. Sans code pour les tests.'
            : 'Orange/Moov : le numéro du paiement. Carte : e-mail ou téléphone. Un code confirme que c’est bien vous.'}
        </p>

        {deviceOrders.length > 0 && step !== 'results' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-accent" />
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-mute">
                Déjà sur cet appareil
              </p>
            </div>
            <div className="space-y-2.5">
              {deviceOrders.map(order => (
                <OrderCard key={order.token} order={order} onOpen={token => openToken(token, { orderId: order.orderId })} />
              ))}
            </div>
          </div>
        )}

        {step === 'identify' && (
          <form onSubmit={sendCode} className="bg-paper border border-line rounded-xl2 shadow-card p-5 space-y-4">
            <div>
              <p className={labelClass}>Comment les retrouver</p>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-cream rounded-xl2 border border-line">
                <button
                  type="button"
                  onClick={() => switchChannel('phone')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    channel === 'phone'
                      ? 'bg-paper text-brand shadow-card ring-1 ring-line'
                      : 'text-ink-mute hover:text-ink'
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => switchChannel('email')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    channel === 'email'
                      ? 'bg-paper text-brand shadow-card ring-1 ring-line'
                      : 'text-ink-mute hover:text-ink'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
              </div>
            </div>

            {channel === 'phone' ? (
              <div>
                <label className={labelClass}>Numéro Orange, Moov ou carte</label>
                <div className="flex">
                  <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                    <input
                      type="tel"
                      value={localNumber}
                      onChange={e => setLocalNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="70 00 00 00"
                      className={`${inputBase} h-11 pl-10 pr-3 rounded-l-none tabular-nums`}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>
                {localNumber && (
                  <p className={`mt-2 text-[11px] font-semibold flex items-center gap-1.5 ${isValidPhone(fullPhone) ? 'text-brand' : 'text-red-600'}`}>
                    {isValidPhone(fullPhone) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    {isValidPhone(fullPhone) ? 'Numéro valide' : 'Numéro invalide'}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className={labelClass}>Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className={`${inputBase} pl-10 pr-3`}
                    autoComplete="email"
                    required
                  />
                </div>
                {email && (
                  <p className={`mt-2 text-[11px] font-semibold flex items-center gap-1.5 ${EMAIL_RE.test(email.trim()) ? 'text-brand' : 'text-red-600'}`}>
                    {EMAIL_RE.test(email.trim()) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    {EMAIL_RE.test(email.trim()) ? 'Email valide' : "Format d'email invalide"}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-brand text-paper text-[14px] font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {SKIP_GUEST_TICKET_OTP ? 'Voir mes billets' : 'Envoyer le code'}
            </button>
          </form>
        )}

        {!SKIP_GUEST_TICKET_OTP && step === 'otp' && (
          <form onSubmit={verify} className="bg-paper border border-line rounded-xl2 shadow-card p-5 space-y-4">
            <div>
              <label className={labelClass}>
                {channel === 'email' ? 'Code e-mail (6 chiffres)' : 'Code SMS (6 chiffres)'}
              </label>
              <p className="text-[13px] text-ink-mute mb-3">
                Envoyé à <span className="font-semibold text-ink">{destinationLabel}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2.5 border border-line rounded-xl text-[18px] tracking-[0.3em] text-center font-bold focus:outline-none focus:border-brand"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full h-11 rounded-lg bg-brand text-paper text-[14px] font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Voir mes billets
            </button>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <button type="button" className="text-ink-mute hover:text-ink" onClick={() => { setStep('identify'); setCode(''); }}>
                {channel === 'email' ? 'Changer d’e-mail' : 'Changer de numéro'}
              </button>
              <button
                type="button"
                className="font-semibold text-brand disabled:opacity-50"
                disabled={busy}
                onClick={sendCode}
              >
                Renvoyer
              </button>
            </div>
          </form>
        )}

        {step === 'results' && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-mute">
              {results.length} commande{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
            </p>
            {results.map(order => (
              <OrderCard key={order.token} order={order} onOpen={token => openToken(token, { orderId: order.orderId })} />
            ))}
            <button
              type="button"
              className="w-full text-[13px] text-ink-mute hover:text-ink py-2"
              onClick={() => { setStep('identify'); setCode(''); }}
            >
              Nouvelle recherche
            </button>
          </div>
        )}

        <div className="mt-8 rounded-xl2 border border-line bg-paper/80 p-4">
          <p className="text-[13px] font-bold text-ink mb-1">Toujours rien ?</p>
          <p className="text-[13px] text-ink-mute leading-relaxed mb-3">
            Écrivez-nous avec l’e-mail ou le numéro du paiement. On retrouve la commande.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="mailto:support@tembas.com?subject=Retrouver%20mes%20billets"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line text-[12px] font-bold text-ink hover:border-brand"
            >
              <Mail className="w-3.5 h-3.5" />
              support@tembas.com
            </a>
            <a
              href="https://wa.me/22674750815"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line text-[12px] font-bold text-ink hover:border-brand"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-mute">
          Vous avez un compte ?{' '}
          <Link to="/login" state={{ redirectTo: '/profile/my-tickets' }} className="font-semibold text-brand">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
