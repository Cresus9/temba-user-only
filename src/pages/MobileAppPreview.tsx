import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Home,
  MapPin,
  Navigation,
  Search,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Ticket,
  User,
} from 'lucide-react';
import Logo from '../components/brand/Logo';
import PageSEO from '../components/SEO/PageSEO';

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

/** Outer chrome: reads like a device frame on the marketing site */
function PhoneFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col items-center">
      <div className="rounded-[2rem] bg-ink p-[10px] shadow-pop max-w-full">
        <div
          className="rounded-[1.35rem] overflow-hidden bg-cream border border-paper/10 w-[min(100vw-2rem,360px)]"
          style={{ aspectRatio: '9 / 19.2', maxHeight: 'min(78vh, 780px)' }}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center max-w-[360px] px-2">
        <p
          className="text-[13px] font-bold text-ink tracking-tight"
          style={{ fontFamily: display }}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[12px] text-ink-mute mt-1 leading-relaxed">{subtitle}</p>
        )}
      </figcaption>
    </figure>
  );
}

function PreviewHome() {
  const cats = [
    { label: 'Pour vous', active: true },
    { label: 'Festivals', active: false },
    { label: 'Sports', active: false },
    { label: 'Cinéma', active: false },
  ];
  return (
    <div className="min-h-full flex flex-col text-ink">
      {/* status bar spacer */}
      <div className="h-2 bg-cream shrink-0" />
      <header className="px-3 pt-1 pb-2 bg-paper/95 backdrop-blur border-b border-line flex items-center justify-between gap-2">
        <Logo size={22} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-full bg-cream border border-line text-[11px] font-semibold"
          >
            <span className="text-sm leading-none">🇧🇫</span>
            Ouaga
            <ChevronRight className="w-3 h-3 text-ink-mute" />
          </button>
          <button
            type="button"
            className="relative w-9 h-9 rounded-lg border border-line bg-paper flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-ink" strokeWidth={2} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-paper" />
          </button>
        </div>
      </header>

      <div className="px-3 pt-3 pb-2 flex-1 bg-cream bg-grain">
        <div className="relative rounded-xl2 border border-line bg-paper shadow-card">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
          <div className="h-10 pl-9 pr-3 flex items-center text-[13px] text-ink-mute">
            Rechercher un événement…
          </div>
        </div>

        <p
          className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand"
          style={{ fontFamily: mono }}
        >
          Catégories
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {cats.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`flex-shrink-0 flex flex-col items-center gap-1 w-[72px] py-2 rounded-xl2 border transition-colors ${
                c.active
                  ? 'bg-brand-50 border-brand text-brand'
                  : 'bg-paper border-line text-ink-mute'
              }`}
            >
              <span className="text-lg">{c.active ? '◆' : '○'}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>

        <p
          className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand"
          style={{ fontFamily: mono }}
        >
          En vedette
        </p>
        <div className="rounded-xl2 border border-line overflow-hidden shadow-card bg-ink relative h-[140px]">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'linear-gradient(135deg, #7c2d12 0%, #1e1b4b 45%, #0f172a 100%)',
            }}
          />
          <div className="absolute inset-0 p-3 flex flex-col justify-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-paper/80 mb-1">
              Concert
            </span>
            <p
              className="text-paper text-[15px] font-bold leading-tight"
              style={{ fontFamily: display }}
            >
              Hokage Vibes 3
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-paper/75">23–24 mai</span>
              <span className="px-3 py-1 rounded-lg bg-brand text-paper text-[11px] font-bold">
                Réserver
              </span>
            </div>
          </div>
        </div>

        <p
          className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand"
          style={{ fontFamily: mono }}
        >
          À venir · 14 jours
        </p>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex gap-2.5 p-2.5 rounded-xl2 border border-line bg-paper shadow-card mb-2"
          >
            <div className="w-14 h-14 rounded-lg bg-cream-deep shrink-0 ring-1 ring-line" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-accent tabular-nums">
                16 mai · 19:00
              </p>
              <p
                className="text-[13px] font-bold text-ink truncate"
                style={{ fontFamily: display }}
              >
                Ciné plein air
              </p>
              <p className="text-[11px] text-ink-mute truncate">Ouaga Mall</p>
              <p className="text-[12px] font-bold text-ink mt-0.5 tabular-nums">
                8 000 FCFA
              </p>
            </div>
            <button
              type="button"
              className="self-center px-2.5 py-1.5 rounded-lg bg-brand text-paper text-[11px] font-bold shrink-0"
            >
              Acheter
            </button>
          </div>
        ))}
      </div>

      <nav className="mt-auto border-t border-line bg-paper px-2 pt-1.5 pb-3 flex justify-around">
        {[
          { Icon: Home, label: 'Accueil', on: true },
          { Icon: Search, label: 'Recherche', on: false },
          { Icon: Ticket, label: 'Billets', on: false },
          { Icon: User, label: 'Profil', on: false },
        ].map(({ Icon, label, on }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-0.5 w-16 pt-1 ${on ? 'text-brand' : 'text-ink-mute'}`}
          >
            <Icon className="w-5 h-5" strokeWidth={on ? 2.5 : 2} />
            <span className="text-[9px] font-semibold">{label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}

function PreviewBooking() {
  return (
    <div className="min-h-full flex flex-col bg-cream text-ink">
      <div className="h-2 bg-cream shrink-0" />
      <div className="relative h-[120px] bg-ink shrink-0">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'linear-gradient(120deg, #7f1d1d 0%, #0f172a 100%)',
          }}
        />
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          <span className="w-8 h-8 rounded-full bg-paper/95 border border-line flex items-center justify-center text-ink">
            ‹
          </span>
          <span className="w-8 h-8 rounded-full bg-paper/95 border border-line flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </span>
        </div>
        <p
          className="absolute bottom-2 left-3 right-3 text-paper text-[14px] font-bold leading-tight drop-shadow"
          style={{ fontFamily: display }}
        >
          Ciné plein air — Acte 8
        </p>
      </div>

      <div className="flex-1 -mt-3 rounded-t-2xl bg-paper border-x border-t border-line shadow-card px-3 pt-3 pb-24">
        <div className="flex p-1 rounded-xl2 bg-cream border border-line">
          <div className="flex-1 py-2 rounded-lg bg-paper shadow-sm text-center text-[12px] font-bold text-brand">
            Billets
          </div>
          <div className="flex-1 py-2 rounded-lg text-center text-[12px] font-semibold text-ink-mute">
            Détails
          </div>
        </div>

        <p
          className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-brand mb-2"
          style={{ fontFamily: mono }}
        >
          Choisir vos billets
        </p>

        <div className="rounded-xl2 border-2 border-brand bg-brand-50/40 p-3 mb-2 relative overflow-hidden">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-l-xl2" />
          <div className="flex items-start gap-2 pl-1">
            <Ticket className="w-4 h-4 text-brand mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold" style={{ fontFamily: display }}>
                Entrée solo
              </p>
              <p className="text-[11px] text-ink-mute">Billet d'entrée standard</p>
              <p className="text-[15px] font-bold text-brand mt-1 tabular-nums">
                8 000 FCFA
              </p>
            </div>
            <div className="flex items-center gap-2 bg-paper rounded-lg border border-line px-1 py-0.5">
              <button type="button" className="w-7 h-7 text-brand font-bold">
                −
              </button>
              <span className="text-[13px] font-bold tabular-nums w-4 text-center">1</span>
              <button type="button" className="w-7 h-7 text-brand font-bold">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-3 mb-2 opacity-80">
          <p className="text-[13px] font-bold text-ink-mute">Entrée duo</p>
          <p className="text-[11px] text-ink-mute">2 personnes</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[14px] font-bold tabular-nums">15 000 FCFA</span>
            <div className="flex items-center gap-2 text-ink-mute">
              <span className="w-7 h-7 flex items-center justify-center rounded border border-line">
                −
              </span>
              <span className="text-[13px] font-bold w-4 text-center">0</span>
              <span className="w-7 h-7 flex items-center justify-center rounded border border-line">
                +
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-cream/80 p-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand" />
          <span className="text-[12px] font-semibold text-ink flex-1">
            Codes promo & crédits
          </span>
          <ChevronRight className="w-4 h-4 text-ink-mute" />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-paper px-3 py-2.5 flex items-center justify-between gap-2 shadow-[0_-8px_24px_rgba(20,23,42,0.06)]">
        <div>
          <p className="text-[10px] text-ink-mute font-semibold uppercase tracking-wide">
            1 billet
          </p>
          <p
            className="text-[16px] font-bold text-ink tabular-nums"
            style={{ fontFamily: display }}
          >
            8 000 FCFA
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl2 bg-brand text-paper text-[12px] font-bold"
        >
          <CreditCard className="w-4 h-4" />
          Paiement
        </button>
      </div>
    </div>
  );
}

function PreviewPayment() {
  return (
    <div className="min-h-full flex flex-col bg-cream text-ink">
      <div className="h-2 bg-cream shrink-0" />
      <header className="px-3 py-3 bg-paper border-b border-line flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg border border-line flex items-center justify-center">
          ‹
        </span>
        <h1
          className="text-[16px] font-bold flex-1 text-center pr-8"
          style={{ fontFamily: display }}
        >
          Paiement
        </h1>
      </header>

      <div className="flex-1 px-3 py-3 space-y-3 overflow-auto pb-24">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand"
          style={{ fontFamily: mono }}
        >
          Méthode de paiement
        </p>
        <div className="rounded-xl2 border border-line bg-paper p-1 flex shadow-card">
          <div className="flex-1 py-2 rounded-lg border border-brand bg-brand-50 text-center">
            <Smartphone className="w-4 h-4 text-brand mx-auto mb-0.5" />
            <span className="text-[11px] font-bold text-brand">Mobile Money</span>
          </div>
          <div className="flex-1 py-2 rounded-lg text-center text-ink-mute">
            <CreditCard className="w-4 h-4 mx-auto mb-0.5" />
            <span className="text-[11px] font-semibold">Carte</span>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-3 shadow-card space-y-3">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute"
            style={{ fontFamily: mono }}
          >
            Opérateur
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand bg-brand-50 text-[12px] font-bold text-brand">
            <Smartphone className="w-3.5 h-3.5" />
            Orange Money
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
              style={{ fontFamily: mono }}
            >
              Numéro
            </label>
            <div className="mt-1 flex gap-2">
              <span
                className="px-2.5 py-2 rounded-lg border border-line bg-cream text-[12px] font-bold tabular-nums"
                style={{ fontFamily: mono }}
              >
                +226
              </span>
              <div className="flex-1 h-10 rounded-lg border border-line bg-paper px-3 flex items-center text-[13px] text-ink-mute tabular-nums">
                55 00 00 00
              </div>
            </div>
            <p className="text-[10px] text-ink-mute mt-1">
              Sans indicatif pays
            </p>
          </div>

          <div className="rounded-xl2 border border-brand/25 bg-cream p-3 space-y-2">
            <p className="text-[12px] font-bold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand text-xs">
                🔒
              </span>
              Code OTP Orange Money
            </p>
            <p className="text-[11px] text-ink-mute">Composez sur votre téléphone :</p>
            <div className="flex gap-2 items-center">
              <code
                className="flex-1 text-[11px] font-bold bg-paper border border-line rounded-lg px-2 py-2 tabular-nums truncate"
                style={{ fontFamily: mono }}
              >
                *144*4*6*8000#
              </code>
              <button
                type="button"
                className="text-[11px] font-bold text-brand px-2 py-2"
              >
                Copier
              </button>
            </div>
            <button
              type="button"
              className="w-full py-2.5 rounded-xl2 bg-brand text-paper text-[12px] font-bold flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Ouvrir le clavier
            </button>
            <div className="h-10 rounded-lg border border-dashed border-line bg-paper/50 flex items-center px-3 text-[12px] text-ink-mute">
              Code OTP reçu par SMS
            </div>
          </div>
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-3 shadow-card">
          <p className="text-[11px] font-bold text-ink mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand" />
            Résumé
          </p>
          <div className="flex justify-between text-[12px] text-ink-mute">
            <span>Sous-total</span>
            <span className="tabular-nums font-semibold text-ink">8 000 FCFA</span>
          </div>
          <div className="flex justify-between text-[12px] text-ink-mute mt-1">
            <span>Frais de service</span>
            <span className="tabular-nums font-semibold text-ink">0 FCFA</span>
          </div>
          <div className="border-t border-line mt-2 pt-2 flex justify-between">
            <span className="text-[13px] font-bold">Total</span>
            <span
              className="text-[14px] font-bold text-brand tabular-nums"
              style={{ fontFamily: display }}
            >
              8 000 FCFA
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-paper px-3 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-ink-mute uppercase font-bold tracking-wide">
            Total à payer
          </p>
          <p className="text-[15px] font-bold tabular-nums" style={{ fontFamily: display }}>
            8 000 FCFA
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl2 bg-line text-ink-mute text-[12px] font-bold"
        >
          Valider OTP
        </button>
      </div>
    </div>
  );
}

function PreviewTicket() {
  return (
    <div className="min-h-full flex flex-col bg-cream text-ink">
      <div className="h-2 bg-cream shrink-0" />
      <header className="px-3 py-2.5 bg-paper border-b border-line flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg border border-line flex items-center justify-center">
          ‹
        </span>
        <h1
          className="text-[15px] font-bold flex-1 text-center truncate px-2"
          style={{ fontFamily: display }}
        >
          Détails du billet
        </h1>
        <span className="w-8 h-8 rounded-lg border border-line flex items-center justify-center">
          <Download className="w-4 h-4" />
        </span>
      </header>

      <div className="flex-1 overflow-auto pb-4">
        <div className="px-3 pt-3 grid grid-cols-4 gap-2">
          {(
            [
              { label: 'Carte', Icon: MapPin },
              { label: 'Itinéraire', Icon: Navigation },
              { label: 'Accueil', Icon: Home },
              { label: 'Transférer', Icon: Send },
            ] as const
          ).map(({ label, Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 py-2 rounded-xl2 border border-line bg-paper shadow-card"
            >
              <Icon className="w-4 h-4 text-brand" strokeWidth={2.2} />
              <span className="text-[9px] font-semibold text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mx-3 mt-3 rounded-xl2 overflow-hidden border border-line shadow-card h-[100px] bg-ink relative">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: 'linear-gradient(90deg, #991b1b, #0f172a)',
            }}
          />
          <p className="absolute bottom-2 left-2 right-2 text-paper text-[11px] font-bold">
            Plein air Ouaga — Acte 8
          </p>
        </div>

        <div className="mx-3 mt-4 rounded-xl2 border border-line bg-paper shadow-card p-4 flex flex-col items-center">
          <div
            className="w-[120px] h-[120px] rounded-xl2 bg-paper border-2 border-line grid place-items-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, #14172A 0px, #14172A 4px, transparent 4px, transparent 8px), repeating-linear-gradient(90deg, #14172A 0px, #14172A 4px, transparent 4px, transparent 8px)',
              backgroundSize: '8px 8px',
              opacity: 0.85,
            }}
          >
            <span className="text-[10px] font-bold text-paper bg-ink/80 px-2 py-1 rounded">
              QR
            </span>
          </div>
          <p className="text-[11px] text-ink-mute mt-3 text-center">
            Présentez ce code à l'entrée
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            ✓ Valide
          </span>
        </div>

        <div className="mx-3 mt-3 rounded-xl2 border border-line bg-paper p-3 shadow-card space-y-2">
          <p className="text-[15px] font-bold" style={{ fontFamily: display }}>
            Ciné plein air
          </p>
          <p className="text-[12px] text-ink-mute flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            16 mai 2026 à 19:00
          </p>
          <p className="text-[12px] text-ink-mute flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            Ouaga Mall
          </p>
          <div className="flex justify-between items-center pt-2 border-t border-line">
            <span className="text-[10px] font-bold uppercase text-ink-mute">
              Type
            </span>
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand text-[10px] font-bold border border-brand/20">
              Entrée solo
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-ink-mute">
              Prix
            </span>
            <span className="text-[14px] font-bold tabular-nums">8 000 FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileAppPreview() {
  return (
    <div className="min-h-screen bg-paper">
      <PageSEO
        title="Prévisualisation app mobile — Temba"
        description="Aperçu statique des écrans mobiles Temba alignés sur la charte web (cream, paper, brand, accent)."
        canonicalUrl="https://tembas.com/preview/app-mobile"
        ogImage="https://tembas.com/temba-app.png"
        keywords={['Temba', 'design', 'mobile', 'prévisualisation']}
      />

      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-28 -left-20 w-[280px] h-[280px] rounded-full bg-accent-50 blur-3xl opacity-60"
        />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
            style={{ fontFamily: mono }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
            Design system
          </p>
          <h1
            className="text-[clamp(26px,4vw,40px)] font-bold text-ink leading-[1.08] tracking-tight max-w-3xl"
            style={{ fontFamily: display }}
          >
            Application mobile —{' '}
            <span className="relative inline-block">
              <span className="relative z-10">aperçu</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0"
              />
            </span>{' '}
            web
          </h1>
          <p className="mt-4 text-[15px] text-ink-mute max-w-2xl leading-relaxed">
            Maquettes HTML intégrées au site pour montrer comment les écrans
            natifs pourraient reprendre la même charte que le web : fond
            chaud, cartes paper, bleu Temba pour les actions, orange en accent,
            typo Plus Jakarta + Inter.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl2 border border-line bg-paper shadow-card text-[12px] text-ink-mute">
            <Sparkles className="w-4 h-4 text-brand shrink-0" />
            <span>
              URL de cette page :{' '}
              <code className="text-ink font-semibold">/preview/app-mobile</code>
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-6 text-center"
          style={{ fontFamily: mono }}
        >
          Aperçu des écrans
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-14 justify-items-center">
          <PhoneFrame
            title="Accueil"
            subtitle="Recherche, catégories, vedette et liste — même rythme que le web."
          >
            <PreviewHome />
          </PhoneFrame>
          <PhoneFrame
            title="Réservation"
            subtitle="Onglets sur fond cream, billet sélectionné avec barre brand à gauche."
          >
            <PreviewBooking />
          </PhoneFrame>
          <PhoneFrame
            title="Paiement Orange Money"
            subtitle="Segmented control, une carte OTP, résumé séparé — moins de cadres bleus empilés."
          >
            <PreviewPayment />
          </PhoneFrame>
          <PhoneFrame
            title="Billet"
            subtitle="QR encadré paper, statut vert, métadonnées typées comme le ticket web."
          >
            <PreviewTicket />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
