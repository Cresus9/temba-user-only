import React, { useState } from 'react';
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
  Database,
  Send,
  CheckCircle,
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
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  // Data-request form state
  const [reqType,   setReqType]   = useState<'delete_data' | 'delete_account'>('delete_data');
  const [email,     setEmail]     = useState('');
  const [reason,    setReason]    = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending,   setSending]   = useState(false);

  const handleDataRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Send request via mailto (no backend needed — opens mail client)
    const subject = encodeURIComponent(
      reqType === 'delete_account'
        ? 'Demande de suppression de compte — Temba'
        : 'Demande de suppression de données — Temba'
    );
    const body = encodeURIComponent(
      `Type de demande: ${reqType === 'delete_account' ? 'Suppression du compte' : 'Suppression des données uniquement'}\n` +
      `Email: ${email}\n` +
      `Raison: ${reason || 'Non précisée'}\n\n` +
      `---\nRequest type: ${reqType === 'delete_account' ? 'Full account deletion' : 'Data deletion only'}\nEmail: ${email}`
    );
    window.location.href = `mailto:support@tembas.com?subject=${subject}&body=${body}`;
    setTimeout(() => { setSending(false); setSubmitted(true); }, 800);
  };

  const isFr = lang === 'fr';

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-[12px] text-ink-mute">
            <Link to="/" className="hover:text-ink transition-colors">
              {isFr ? 'Accueil' : 'Home'}
            </Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <span className="text-ink font-semibold">
              {isFr ? 'Supprimer mon compte' : 'Delete my account'}
            </span>
          </nav>
          {/* Language toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-paper border border-line rounded-lg">
            {(['fr', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all ${
                  lang === l ? 'bg-brand text-paper' : 'text-ink-mute hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
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
              {isFr ? 'Suppression de compte' : 'Account Deletion'}
            </p>
          </div>

          <h1
            className="text-[clamp(26px,4.5vw,44px)] font-bold text-ink leading-[1.06] tracking-tight max-w-3xl"
            style={{ fontFamily: displayFamily }}
          >
            {isFr ? 'Supprimer votre compte' : 'Delete your account'}{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Temba</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 bg-red-200/70 rounded-sm -z-0"
              />
            </span>
          </h1>
          <p className="mt-4 text-[15px] sm:text-[16px] text-ink-mute leading-relaxed max-w-2xl">
            {isFr
              ? 'Cette page vous explique comment supprimer définitivement votre compte et toutes vos données associées. Prenez le temps de lire attentivement.'
              : 'This page explains how to permanently delete your Temba account and all associated data. Please read carefully before proceeding.'}
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

        {/* ── Data-only deletion request form ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-brand" strokeWidth={2} />
            <h2 className="text-[20px] font-bold text-ink tracking-tight" style={{ fontFamily: displayFamily }}>
              {isFr ? 'Supprimer vos données sans fermer le compte' : 'Delete your data without closing your account'}
            </h2>
          </div>
          <p className="text-[14px] text-ink-mute mb-6 leading-relaxed">
            {isFr
              ? 'Vous pouvez demander la suppression de certaines données (historique, préférences, données de navigation) sans supprimer votre compte. Remplissez le formulaire ci-dessous ou contactez-nous par e-mail.'
              : 'You can request deletion of specific data (history, preferences, browsing data) without deleting your account. Fill in the form below or contact us by email.'}
          </p>

          {submitted ? (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[14px] font-bold text-emerald-800 mb-1">
                  {isFr ? 'Demande envoyée' : 'Request sent'}
                </p>
                <p className="text-[13px] text-emerald-700">
                  {isFr
                    ? 'Nous avons bien reçu votre demande. Notre équipe traitera votre demande dans un délai de 30 jours.'
                    : 'We have received your request. Our team will process it within 30 days.'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDataRequest} className="bg-paper border border-line rounded-2xl shadow-card p-6 space-y-5">
              {/* Request type */}
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    value: 'delete_data',
                    label: isFr ? 'Supprimer mes données uniquement' : 'Delete my data only',
                    sub: isFr ? 'Le compte reste actif' : 'Keep the account active',
                  },
                  {
                    value: 'delete_account',
                    label: isFr ? 'Supprimer mon compte complet' : 'Delete my full account',
                    sub: isFr ? 'Compte + toutes les données' : 'Account + all data',
                  },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      reqType === opt.value
                        ? 'border-brand bg-brand/5'
                        : 'border-line bg-cream hover:border-brand/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reqType"
                      value={opt.value}
                      checked={reqType === opt.value}
                      onChange={() => setReqType(opt.value as typeof reqType)}
                      className="mt-0.5 accent-brand"
                    />
                    <div>
                      <p className="text-[13px] font-bold text-ink">{opt.label}</p>
                      <p className="text-[11px] text-ink-mute">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-bold text-ink-mute uppercase tracking-wide mb-1.5" style={{ fontFamily: monoFamily }}>
                  {isFr ? 'Adresse e-mail du compte' : 'Account email address'} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isFr ? 'votre@email.com' : 'your@email.com'}
                  className="w-full px-4 py-3 rounded-xl border border-line bg-cream focus:outline-none focus:border-brand text-[14px] text-ink placeholder-ink-mute/50 transition-colors"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[12px] font-bold text-ink-mute uppercase tracking-wide mb-1.5" style={{ fontFamily: monoFamily }}>
                  {isFr ? 'Raison (optionnel)' : 'Reason (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={isFr ? 'Dites-nous pourquoi vous souhaitez cette suppression…' : 'Tell us why you want this deletion…'}
                  className="w-full px-4 py-3 rounded-xl border border-line bg-cream focus:outline-none focus:border-brand text-[14px] text-ink placeholder-ink-mute/50 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !email}
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-paper rounded-xl text-[14px] font-bold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
                {sending
                  ? (isFr ? 'Envoi…' : 'Sending…')
                  : (isFr ? 'Envoyer la demande' : 'Send request')}
              </button>

              <p className="text-[11px] text-ink-mute/60">
                {isFr
                  ? 'Votre demande sera traitée dans un délai maximum de 30 jours, conformément au RGPD.'
                  : 'Your request will be processed within 30 days, in compliance with GDPR.'}
              </p>
            </form>
          )}
        </section>

        {/* ── Support ── */}
        <section>
          <h2
            className="text-[20px] font-bold text-ink tracking-tight mb-2"
            style={{ fontFamily: displayFamily }}
          >
            {isFr ? "Besoin d'aide ?" : 'Need help?'}
          </h2>
          <p className="text-[14px] text-ink-mute mb-6 leading-relaxed">
            {isFr
              ? "Si vous rencontrez des difficultés pour supprimer votre compte ou si vous avez des questions concernant la suppression de vos données, notre équipe de support est là pour vous aider."
              : "If you have trouble deleting your account or have questions about your data, our support team is here to help."}
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
