import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Trash2,
  Shield,
  Clock,
  Mail,
  Phone,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  LogIn,
  Settings,
  KeyRound,
} from 'lucide-react';
import PageSEO from '../components/SEO/PageSEO';

const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';
const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const steps = [
  {
    icon: LogIn,
    number: '01',
    title: 'Connectez-vous à votre compte',
    body: 'Accédez à la page de connexion et authentifiez-vous avec vos identifiants Temba.',
    cta: { label: 'Se connecter', to: '/login' },
  },
  {
    icon: Settings,
    number: '02',
    title: 'Accédez aux paramètres du compte',
    body: 'Une fois connecté, ouvrez votre profil puis sélectionnez « Paramètres du compte ».',
    cta: { label: 'Mon profil', to: '/profile' },
  },
  {
    icon: KeyRound,
    number: '03',
    title: 'Confirmez la suppression',
    body: (
      <>
        Faites défiler jusqu'à la section <strong className="text-ink">Supprimer le compte</strong>,
        saisissez{' '}
        <code
          className="inline-block px-2 py-0.5 rounded-md text-[12px] font-mono bg-cream-deep border border-line text-ink mx-0.5"
          style={{ fontFamily: monoFamily }}
        >
          delete my account
        </code>{' '}
        et confirmez.
      </>
    ),
    cta: null,
  },
];

const deletedData = [
  'Informations personnelles (nom, e-mail, téléphone)',
  'Informations du profil',
  "Tous vos billets d'événements",
  'Historique des commandes',
  'Méthodes de paiement sauvegardées',
  'Historique de connexion',
  'Préférences de notification',
  'Paramètres du compte',
];

const retainedData = [
  'Enregistrements de transactions financières',
  'Informations fiscales (si applicable)',
  'Données de prévention de la fraude',
  'Enregistrements de conformité réglementaire',
];

const retentionPeriods = [
  {
    color: 'bg-emerald-500',
    title: 'Données du compte',
    desc: 'Supprimées immédiatement après confirmation',
  },
  {
    color: 'bg-amber-400',
    title: 'Enregistrements financiers',
    desc: 'Conservés pendant 7 ans (obligation légale)',
  },
  {
    color: 'bg-amber-400',
    title: 'Données de conformité',
    desc: 'Conservées selon les exigences de la réglementation applicable',
  },
];

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-paper">
      <PageSEO
        title="Supprimer mon compte Temba"
        description="Découvrez comment supprimer définitivement votre compte Temba et toutes vos données associées."
        canonicalUrl="https://tembas.com/account-deletion"
        robots="noindex, nofollow"
      />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-line bg-cream/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-[12px] text-ink-mute">
            <Link to="/" className="hover:text-ink transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <span className="text-ink font-semibold">Supprimer mon compte</span>
          </nav>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-[360px] h-[360px] rounded-full bg-red-100 blur-3xl opacity-50"
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 grid place-items-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" strokeWidth={2} />
            </div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-600"
              style={{ fontFamily: monoFamily }}
            >
              Suppression de compte
            </p>
          </div>

          <h1
            className="text-[clamp(26px,4.5vw,44px)] font-bold text-ink leading-[1.06] tracking-tight max-w-3xl"
            style={{ fontFamily: displayFamily }}
          >
            Supprimer votre compte{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Temba</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 bg-red-200/70 rounded-sm -z-0"
              />
            </span>
          </h1>
          <p className="mt-4 text-[15px] sm:text-[16px] text-ink-mute leading-relaxed max-w-2xl">
            Cette page vous explique comment supprimer définitivement votre compte et toutes vos données associées. Prenez le temps de lire attentivement.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">

        {/* ── Warning banner ── */}
        <div className="flex gap-4 p-5 rounded-2xl bg-red-50 border border-red-200">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-red-100 grid place-items-center">
            <AlertTriangle className="w-4.5 h-4.5 text-red-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-widest text-red-700 mb-1" style={{ fontFamily: monoFamily }}>
              Action irréversible
            </p>
            <p className="text-[14px] text-red-800 leading-relaxed">
              La suppression de votre compte est <strong>définitive</strong>. Toutes vos données
              personnelles, billets, commandes et historique seront supprimés de manière permanente.
              Cette action <strong>ne peut pas être annulée</strong>.
            </p>
          </div>
        </div>

        {/* ── Steps ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-brand" strokeWidth={2} />
            <h2
              className="text-[20px] font-bold text-ink tracking-tight"
              style={{ fontFamily: displayFamily }}
            >
              Comment supprimer votre compte
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative bg-paper border border-line rounded-2xl p-6 shadow-card flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center">
                    <step.icon className="w-5 h-5 text-brand" strokeWidth={2} />
                  </div>
                  <span
                    className="text-[28px] font-black text-ink-mute/20 leading-none"
                    style={{ fontFamily: displayFamily }}
                  >
                    {step.number}
                  </span>
                </div>
                <div className="flex-1">
                  <h3
                    className="text-[15px] font-bold text-ink mb-1.5"
                    style={{ fontFamily: displayFamily }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-ink-mute leading-relaxed">{step.body}</p>
                </div>
                {step.cta && (
                  <Link
                    to={step.cta.to}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:text-brand/80 transition-colors mt-auto"
                  >
                    {step.cta.label}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Data deleted / retained ── */}
        <section>
          <h2
            className="text-[20px] font-bold text-ink tracking-tight mb-6"
            style={{ fontFamily: displayFamily }}
          >
            Données concernées
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Deleted */}
            <div className="bg-paper border border-line rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <h3
                  className="text-[14px] font-bold text-ink"
                  style={{ fontFamily: displayFamily }}
                >
                  Supprimées immédiatement
                </h3>
              </div>
              <ul className="space-y-2.5">
                {deletedData.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink-mute">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Retained */}
            <div className="bg-paper border border-line rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <h3
                  className="text-[14px] font-bold text-ink"
                  style={{ fontFamily: displayFamily }}
                >
                  Conservées (obligations légales)
                </h3>
              </div>
              <ul className="space-y-2.5">
                {retainedData.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink-mute">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[12px] text-ink-mute/70 border-t border-line pt-4">
                Ces données sont conservées pour nous conformer aux obligations légales et réglementaires. Elles ne sont jamais utilisées à des fins commerciales.
              </p>
            </div>
          </div>
        </section>

        {/* ── Retention periods ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-brand" strokeWidth={2} />
            <h2
              className="text-[20px] font-bold text-ink tracking-tight"
              style={{ fontFamily: displayFamily }}
            >
              Périodes de conservation
            </h2>
          </div>

          <div className="bg-paper border border-line rounded-2xl shadow-card divide-y divide-line">
            {retentionPeriods.map((r) => (
              <div key={r.title} className="flex items-center gap-4 px-6 py-4">
                <span className={`w-2.5 h-2.5 rounded-full ${r.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{r.title}</p>
                  <p className="text-[13px] text-ink-mute">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Support ── */}
        <section>
          <h2
            className="text-[20px] font-bold text-ink tracking-tight mb-2"
            style={{ fontFamily: displayFamily }}
          >
            Besoin d'aide ?
          </h2>
          <p className="text-[14px] text-ink-mute mb-6 leading-relaxed">
            Si vous rencontrez des difficultés pour supprimer votre compte ou si vous avez des
            questions concernant la suppression de vos données, notre équipe de support est là pour
            vous aider.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="mailto:support@tembas.com"
              className="flex items-center gap-4 p-5 bg-paper border border-line rounded-2xl shadow-card hover:border-brand hover:shadow-pop transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <Mail className="w-5 h-5 text-brand" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-ink-mute mb-0.5" style={{ fontFamily: monoFamily }}>
                  Email
                </p>
                <p className="text-[14px] font-semibold text-ink group-hover:text-brand transition-colors">
                  support@tembas.com
                </p>
              </div>
            </a>

            <a
              href="tel:+22674750815"
              className="flex items-center gap-4 p-5 bg-paper border border-line rounded-2xl shadow-card hover:border-brand hover:shadow-pop transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <Phone className="w-5 h-5 text-brand" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-ink-mute mb-0.5" style={{ fontFamily: monoFamily }}>
                  Téléphone
                </p>
                <p className="text-[14px] font-semibold text-ink group-hover:text-brand transition-colors">
                  +226 74 75 08 15
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* ── Footer links ── */}
        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-5 text-[12px] text-ink-mute">
            <Link to="/privacy" className="hover:text-ink transition-colors">
              Politique de confidentialité
            </Link>
            <Link to="/terms" className="hover:text-ink transition-colors">
              Conditions d'utilisation
            </Link>
            <Link to="/contact" className="hover:text-ink transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-[11px] text-ink-mute/50" style={{ fontFamily: monoFamily }}>
            Mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
