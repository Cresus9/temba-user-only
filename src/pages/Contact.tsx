import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  Instagram,
  Facebook,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

const inputBase =
  'w-full h-11 px-3.5 bg-paper border border-line text-[14px] text-ink placeholder:text-ink-mute rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-50 transition-colors';
const labelBase =
  'block text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-1.5';

type Channel = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  href?: string;
  body: React.ReactNode;
  mono?: boolean;
};

const channels: Channel[] = [
  {
    icon: Mail,
    eyebrow: 'Email',
    title: 'info@tembas.com',
    href: 'mailto:info@tembas.com',
    body: 'On vous répond sous 24h ouvrées.',
  },
  {
    icon: Phone,
    eyebrow: 'Téléphone',
    title: '+226 74 75 08 15',
    href: 'tel:+22674750815',
    body: 'Lun–Ven · 9h–18h GMT',
    mono: true,
  },
  {
    icon: MapPin,
    eyebrow: 'Adresse',
    title: 'Zone 1, Section KC',
    body: 'Parcelle 09-10, Ouagadougou, Burkina Faso',
  },
  {
    icon: Clock,
    eyebrow: 'Horaires',
    title: 'Lun–Ven · 9h–18h',
    body: 'Réponses week-end sous 48h.',
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.rpc('create_anonymous_support_ticket', {
        p_name: formData.name,
        p_email: formData.email,
        p_subject: formData.subject,
        p_message: formData.message,
      });

      if (error) throw error;

      toast.success(
        'Message envoyé avec succès ! Notre équipe vous contactera bientôt.'
      );
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
      toast.error("Échec de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: 'https://tembas.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Contact',
            item: 'https://tembas.com/contact',
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Temba',
        url: 'https://tembas.com/contact',
        description:
          "Contactez l'équipe Temba pour toute question sur vos billets, les événements ou le support client.",
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: '+22674750815',
            contactType: 'customer service',
            areaServed: 'BF',
            availableLanguage: ['French'],
            email: 'info@tembas.com',
          },
        ],
        mainEntityOfPage: 'https://tembas.com/contact',
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-paper">
      <PageSEO
        title="Contact"
        description="Besoin d'aide ? Contactez l'équipe Temba par email, téléphone ou via notre formulaire pour toute question sur vos billets et événements."
        canonicalUrl="https://tembas.com/contact"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'contact Temba',
          'service client billetterie',
          'assistance billets Burkina',
          'support Temba',
        ]}
        structuredData={structuredData}
      />

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
            <span className="text-ink font-semibold">Contact</span>
          </nav>
        </div>
      </div>

      {/* — Hero — */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 w-[300px] h-[300px] rounded-full bg-accent-50 blur-3xl opacity-60"
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
            Contact
          </p>
          <h1
            className="text-[clamp(28px,4.4vw,44px)] font-bold text-ink leading-[1.05] tracking-tight max-w-3xl"
            style={{ fontFamily: displayFamily }}
          >
            On répond aux{' '}
            <span className="relative inline-block">
              <span className="relative z-10">vraies questions</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0"
              />
            </span>
            , pas aux tickets perdus.
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-ink-mute leading-relaxed max-w-2xl">
            Que ce soit pour un billet, un transfert, un remboursement ou pour
            organiser un événement avec nous — on est là. Choisissez le canal qui
            vous parle.
          </p>
        </div>
      </section>

      {/* — Body — */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12">
          {/* — Channels — */}
          <section>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
              style={{ fontFamily: monoFamily }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
              Nous joindre
            </p>
            <h2
              className="text-[22px] sm:text-[26px] font-bold text-ink leading-tight tracking-tight mb-6"
              style={{ fontFamily: displayFamily }}
            >
              Quatre façons de nous parler.
            </h2>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {channels.map(({ icon: Icon, eyebrow, title, href, body, mono }) => {
                const inner = (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-0.5"
                        style={{ fontFamily: monoFamily }}
                      >
                        {eyebrow}
                      </p>
                      <p
                        className={`text-[14px] font-bold text-ink leading-tight tracking-tight mb-1 truncate ${
                          mono ? 'tabular-nums' : ''
                        }`}
                        style={{
                          fontFamily: mono ? monoFamily : displayFamily,
                        }}
                      >
                        {title}
                      </p>
                      <p className="text-[12.5px] text-ink-mute leading-snug">
                        {body}
                      </p>
                    </div>
                  </>
                );
                if (href) {
                  return (
                    <li key={eyebrow}>
                      <a
                        href={href}
                        className="group flex items-start gap-3 p-4 bg-paper border border-line rounded-xl2 shadow-card hover:border-brand hover:shadow-card-hover transition-all duration-200 h-full"
                      >
                        {inner}
                      </a>
                    </li>
                  );
                }
                return (
                  <li
                    key={eyebrow}
                    className="flex items-start gap-3 p-4 bg-paper border border-line rounded-xl2 shadow-card h-full"
                  >
                    {inner}
                  </li>
                );
              })}
            </ul>

            {/* Help center pointer */}
            <div className="mt-5 bg-cream rounded-xl2 border border-line shadow-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-50 ring-1 ring-accent/20 grid place-items-center flex-shrink-0">
                <MessageSquare
                  className="w-4 h-4 text-accent-700"
                  strokeWidth={2.2}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-0.5"
                  style={{ fontFamily: monoFamily }}
                >
                  Centre d'aide
                </p>
                <p
                  className="text-[14px] font-bold text-ink leading-tight tracking-tight mb-1"
                  style={{ fontFamily: displayFamily }}
                >
                  La réponse est peut-être déjà là.
                </p>
                <p className="text-[12.5px] text-ink-mute leading-snug mb-2">
                  Articles sur les billets, les transferts, les remboursements…
                </p>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:text-brand-700 transition-colors group"
                >
                  Consulter le centre d'aide
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Social */}
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute"
                style={{ fontFamily: monoFamily }}
              >
                Suivez-nous
              </p>
              <a
                href="https://www.instagram.com/temba_officiel/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
              >
                <Instagram className="w-4 h-4" strokeWidth={2.2} />
              </a>
              <a
                href="https://facebook.com/profile.php?id=61586573277748"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
              >
                <Facebook className="w-4 h-4" strokeWidth={2.2} />
              </a>
              <a
                href="https://tiktok.com/@temba_official7"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </section>

          {/* — Form — */}
          <section>
            <div className="bg-paper rounded-xl2 border border-line shadow-card p-6 md:p-8">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                Formulaire
              </p>
              <h2
                className="text-[22px] sm:text-[26px] font-bold text-ink leading-tight tracking-tight mb-1.5"
                style={{ fontFamily: displayFamily }}
              >
                Écrivez-nous
              </h2>
              <p className="text-[13.5px] text-ink-mute mb-6">
                Un message par mois, dix par jour : tout est lu, tout est répondu.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className={labelBase}>
                      Nom
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Votre nom"
                      className={inputBase}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelBase}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="vous@email.com"
                      className={inputBase}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className={labelBase}>
                    Sujet
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Décrivez en quelques mots le motif"
                    className={inputBase}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className={labelBase}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    rows={6}
                    placeholder="Détaillez votre demande pour qu'on puisse vous répondre vite et bien."
                    className="w-full px-3.5 py-3 bg-paper border border-line text-[14px] text-ink placeholder:text-ink-mute rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-50 transition-colors resize-y min-h-[140px]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-brand text-paper text-[14px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" strokeWidth={2.5} />
                      Envoyer le message
                    </>
                  )}
                </button>

                <div className="flex items-start gap-2 pt-2">
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-brand flex-shrink-0 mt-0.5"
                    strokeWidth={2.5}
                  />
                  <p
                    className="text-[11px] text-ink-mute leading-relaxed"
                    style={{ fontFamily: monoFamily }}
                  >
                    En envoyant ce formulaire, vous acceptez notre{' '}
                    <Link
                      to="/privacy"
                      className="text-brand hover:text-brand-700 font-semibold"
                    >
                      politique de confidentialité
                    </Link>
                    . Vos données ne sont utilisées que pour vous répondre.
                  </p>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
