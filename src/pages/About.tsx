import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Target,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Send,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Logo from '../components/brand/Logo';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

interface PillarCardProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  body: string;
  tone?: 'brand' | 'accent';
}

function PillarCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  tone = 'brand',
}: PillarCardProps) {
  const tile =
    tone === 'accent'
      ? 'bg-accent-50 ring-accent/20 text-accent-700'
      : 'bg-brand-50 ring-brand-100 text-brand';

  return (
    <article className="bg-paper rounded-xl2 border border-line shadow-card p-5 md:p-6 h-full flex flex-col">
      <div
        className={`w-10 h-10 rounded-lg ${tile} grid place-items-center ring-1 mb-4`}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-mute mb-2"
        style={{ fontFamily: monoFamily }}
      >
        {eyebrow}
      </p>
      <h3
        className="text-[18px] font-bold text-ink leading-tight tracking-tight mb-2"
        style={{ fontFamily: displayFamily }}
      >
        {title}
      </h3>
      <p className="text-[14px] text-ink-mute leading-relaxed">{body}</p>
    </article>
  );
}

interface PledgeCardProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  tone: 'brand' | 'accent' | 'green' | 'mute';
}

function PledgeCard({ icon: Icon, title, body, tone }: PledgeCardProps) {
  const tile = {
    brand: 'bg-brand-50 ring-brand-100 text-brand',
    accent: 'bg-accent-50 ring-accent/20 text-accent-700',
    green: 'bg-emerald-50 ring-emerald-200/60 text-emerald-700',
    mute: 'bg-cream-deep ring-line text-ink-mute',
  }[tone];

  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card p-4 md:p-5 h-full flex flex-col">
      <div
        className={`w-9 h-9 rounded-lg ${tile} grid place-items-center ring-1 mb-3`}
      >
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <h3
        className="text-[14px] font-bold text-ink mb-1.5 tracking-tight"
        style={{ fontFamily: displayFamily }}
      >
        {title}
      </h3>
      <p className="text-[13px] text-ink-mute leading-relaxed">{body}</p>
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-paper">
      {/* — Breadcrumb — */}
      <div className="border-b border-line bg-cream/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 text-[12px] text-ink-mute"
          >
            <Link to="/" className="hover:text-ink transition-colors">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <span className="text-ink font-semibold">À propos</span>
          </nav>
        </div>
      </div>

      {/* — Hero — */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-60"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-3"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
            À propos
          </p>
          <h1
            className="text-[clamp(30px,5vw,52px)] font-bold text-ink leading-[1.04] tracking-tight max-w-4xl"
            style={{ fontFamily: displayFamily }}
          >
            La billetterie pensée pour{' '}
            <span className="relative inline-block">
              <span className="relative z-10">l'Afrique de l'Ouest</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0"
              />
            </span>
            .
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] text-ink-mute leading-relaxed max-w-2xl">
            Temba est une marque de <strong className="text-ink">EZSTAY LLC</strong>,
            née à Ouagadougou. On vend des billets directement aux organisateurs
            officiels — jamais en revente — pour que chaque place arrive à son
            propriétaire au juste prix.
          </p>

          {/* CTA pills */}
          <div className="mt-7 flex flex-wrap gap-2">
            <a
              href="https://tembas.com"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-paper border border-line shadow-card text-[12px] font-bold text-ink hover:border-brand hover:text-brand transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
              tembas.com
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=app.rork.temba"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-paper border border-line shadow-card text-[12px] font-bold text-ink hover:border-brand hover:text-brand transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 text-brand"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
              </svg>
              Google Play
            </a>
            <a
              href="https://apps.apple.com/us/app/temba/id6748848506"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-paper border border-line shadow-card text-[12px] font-bold text-ink hover:border-brand hover:text-brand transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 text-brand"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12 md:space-y-16">
        {/* — Pillars — */}
        <section>
          <div className="mb-8">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
              style={{ fontFamily: monoFamily }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
              Notre histoire
            </p>
            <h2
              className="text-[clamp(22px,3.4vw,32px)] font-bold text-ink leading-[1.15] tracking-tight"
              style={{ fontFamily: displayFamily }}
            >
              Une plateforme. Trois ambitions.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PillarCard
              icon={Building2}
              eyebrow="Notre entreprise"
              title="Une marque locale, des standards globaux"
              body="Temba est édité par EZSTAY LLC. On combine l'exigence d'une plateforme moderne avec la connaissance fine du terrain ouest-africain."
              tone="brand"
            />
            <PillarCard
              icon={Target}
              eyebrow="Notre mission"
              title="Connecter sans intermédiaires"
              body="On rapproche les amateurs et les organisateurs avec un canal direct, fluide et fiable — au prix officiel, sans majoration cachée."
              tone="accent"
            />
            <PillarCard
              icon={Users}
              eyebrow="Notre équipe"
              title="Bâtie en Afrique, pour l'Afrique"
              body="Une équipe basée entre Ouagadougou et Dakar, qui code, qui designe et qui passe ses soirées dans les salles qu'elle équipe."
              tone="brand"
            />
          </div>
        </section>

        {/* — Engagements — */}
        <section>
          <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                Notre engagement
              </p>
              <h2
                className="text-[clamp(22px,3.4vw,32px)] font-bold text-ink leading-[1.15] tracking-tight"
                style={{ fontFamily: displayFamily }}
              >
                Une billetterie officielle, sans entourloupe.
              </h2>
            </div>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink hover:text-brand transition-colors group"
            >
              Voir les conditions
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PledgeCard
              icon={CheckCircle2}
              title="Vente primaire"
              body="Les billets sont vendus directement par les organisateurs officiels. Pas de revendeur entre vous et la salle."
              tone="green"
            />
            <PledgeCard
              icon={Shield}
              title="Prix officiels"
              body="Le prix affiché est le prix fixé par l'organisateur. Aucune majoration cachée, jamais."
              tone="brand"
            />
            <PledgeCard
              icon={Send}
              title="Transfert gratuit"
              body="Offrez ou prêtez votre billet à un proche en deux taps depuis l'application — sans frais."
              tone="accent"
            />
            <PledgeCard
              icon={XCircle}
              title="Pas de revente"
              body="La revente avec marge est strictement interdite. On annule les billets concernés sans remboursement."
              tone="mute"
            />
          </div>
        </section>

        {/* — Identity card + contact — */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-8 items-stretch">
            {/* Identity */}
            <div className="bg-cream rounded-xl2 border border-line shadow-card p-6 md:p-8 relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 w-[260px] h-[260px] rounded-full bg-brand-50 blur-3xl opacity-70"
              />
              <div className="relative">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-4"
                  style={{ fontFamily: monoFamily }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                  Identité légale
                </p>
                <Logo size={32} className="mb-4" />
                <h2
                  className="text-[20px] font-bold text-ink mb-1 tracking-tight"
                  style={{ fontFamily: displayFamily }}
                >
                  EZSTAY LLC
                </h2>
                <p className="text-[13px] text-ink-mute mb-5">
                  Marque commerciale · Temba
                </p>
                <dl className="space-y-3 text-[13px]">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute pt-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Activité
                    </dt>
                    <dd className="text-ink font-medium">
                      Billetterie d'événements (vente primaire)
                    </dd>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute pt-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Site web
                    </dt>
                    <dd>
                      <a
                        href="https://tembas.com"
                        className="text-brand hover:text-brand-700 font-semibold transition-colors"
                      >
                        tembas.com
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute pt-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Présence
                    </dt>
                    <dd className="text-ink-mute">
                      Burkina Faso · Côte d'Ivoire · Sénégal · Togo · Bénin · Niger ·
                      Mali
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-paper rounded-xl2 border border-line shadow-card p-6 md:p-8 flex flex-col">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-4"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                Contact
              </p>
              <h2
                className="text-[20px] font-bold text-ink mb-5 tracking-tight"
                style={{ fontFamily: displayFamily }}
              >
                On reste joignable.
              </h2>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center flex-shrink-0">
                    <MapPin
                      className="w-4 h-4 text-brand"
                      strokeWidth={2.2}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      Adresse
                    </p>
                    <p className="text-[13px] text-ink leading-relaxed">
                      Secteur 23, Zone 1, Section KC, Parcelle 09-10
                      <br />
                      Ouagadougou, Burkina Faso
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-brand" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      Téléphone
                    </p>
                    <a
                      href="tel:+22674750815"
                      className="text-[13px] text-ink hover:text-brand font-semibold tabular-nums transition-colors"
                      style={{ fontFamily: monoFamily }}
                    >
                      +226 74 75 08 15
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-brand" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      Email
                    </p>
                    <a
                      href="mailto:info@tembas.com"
                      className="text-[13px] text-ink hover:text-brand font-semibold transition-colors"
                    >
                      info@tembas.com
                    </a>
                  </div>
                </li>
              </ul>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 bg-brand text-paper text-[13px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors group"
              >
                Nous écrire
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* — App download — editorial dark card — */}
        <section>
          <div className="relative bg-ink text-paper rounded-[20px] overflow-hidden shadow-pop">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-brand/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-16 w-[340px] h-[340px] rounded-full bg-accent/25 blur-3xl"
            />
            <div className="relative px-6 py-10 md:px-10 md:py-14 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/10 ring-1 ring-paper/15 text-[10px] font-bold uppercase tracking-[0.22em] text-paper/85 mb-4"
                  style={{ fontFamily: monoFamily }}
                >
                  <Sparkles className="h-3 w-3 text-accent" strokeWidth={2.5} />
                  Application Temba
                </p>
                <h2
                  className="text-[clamp(24px,3.6vw,34px)] font-bold leading-[1.08] tracking-tight mb-3"
                  style={{ fontFamily: displayFamily }}
                >
                  Vos billets,{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10">dans votre poche.</span>
                    <span
                      aria-hidden
                      className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/45 rounded-sm -z-0"
                    />
                  </span>
                </h2>
                <p className="text-[15px] text-paper/75 leading-relaxed max-w-lg">
                  Disponible sur Google Play et App Store. Retrouvez vos billets
                  sur mobile, recevez les notifications de l&apos;événement et
                  découvrez les soirées près de chez vous.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:flex-nowrap">
                <a
                  href="https://play.google.com/store/apps/details?id=app.rork.temba"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl2 bg-paper text-ink hover:bg-cream active:bg-cream-deep transition-colors shadow-card"
                >
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                  </svg>
                  <div className="text-left leading-tight">
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      Disponible sur
                    </div>
                    <div
                      className="text-[14px] font-bold"
                      style={{ fontFamily: displayFamily }}
                    >
                      Google Play
                    </div>
                  </div>
                </a>
                <a
                  href="https://apps.apple.com/us/app/temba/id6748848506"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl2 bg-paper text-ink hover:bg-cream active:bg-cream-deep transition-colors shadow-card"
                >
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left leading-tight">
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      Télécharger sur
                    </div>
                    <div
                      className="text-[14px] font-bold"
                      style={{ fontFamily: displayFamily }}
                    >
                      App Store
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
