import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../brand/Logo';

export type AuthIllustration = 'party' | 'living-room' | 'party-2';

interface AuthShellProps {
  /* Left pane (form side) */
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /* Optional back link inside the form pane (e.g. "Retour à la connexion") */
  backTo?: string;
  backLabel?: string;
  /* Right pane (illustration side) */
  illustration?: AuthIllustration;
  posterEyebrow?: string;
  posterHeadline?: string;
  posterSub?: string;
  /* Tag line stamped under the illustration */
  posterTagline?: string;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

const ILLUSTRATIONS: Record<AuthIllustration, { src: string; alt: string }> = {
  party: { src: '/auth-party.png', alt: 'Amis qui dansent et fêtent ensemble' },
  'party-2': { src: '/auth-party-2.png', alt: 'Groupe en pleine célébration' },
  'living-room': { src: '/auth-living-room.png', alt: 'Deux amis qui partagent un café' },
};

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  backTo,
  backLabel,
  illustration = 'party',
  posterEyebrow = 'Tickets · Burkina Faso',
  posterHeadline = 'Vivez les meilleurs événements près de chez vous.',
  posterSub = 'Concerts, festivals, expériences culturelles — tout en un seul endroit.',
  posterTagline = 'La file commence ici',
}: AuthShellProps) {
  const illu = ILLUSTRATIONS[illustration];

  return (
    <div className="min-h-[100vh] bg-cream bg-grain">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Top brand bar */}
        <div className="flex items-center justify-between mb-6 lg:mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <Logo size={32} />
            <span
              className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-ink-mute group-hover:text-ink transition-colors"
              style={{ fontFamily: monoFamily }}
            >
              Temba Tickets
            </span>
          </Link>
          <Link
            to="/events"
            className="text-[12px] font-semibold text-ink-mute hover:text-ink transition-colors"
          >
            Parcourir les événements →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12 lg:items-stretch">
          {/* ── Left: Form pane ── */}
          <div className="lg:flex lg:flex-col">
            {backTo && (
              <Link
                to={backTo}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel || 'Retour'}
              </Link>
            )}

            <div className="max-w-md">
              {eyebrow && (
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2.5"
                  style={{ fontFamily: monoFamily }}
                >
                  {eyebrow}
                </p>
              )}
              <h1
                className="text-[28px] sm:text-[34px] font-bold text-ink tracking-tight leading-[1.1]"
                style={{ fontFamily: displayFamily }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-[15px] text-ink-mute leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="mt-7 max-w-md flex-1">{children}</div>
          </div>

          {/* ── Right: Illustration pane ── */}
          <aside className="lg:flex">
            {/* Illustration card — flex column so it can match the form height */}
            <div
              className="relative overflow-hidden rounded-[24px] border border-line w-full flex flex-col min-h-[480px] lg:min-h-0"
              style={{
                background:
                  'linear-gradient(160deg, #FCEDE8 0%, #FCE0DC 35%, #F8D2C9 100%)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -28px rgba(20, 23, 42, 0.18)',
              }}
            >
              {/* Soft brand glow accents */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-24 w-72 h-72 rounded-full blur-3xl"
                style={{ background: 'rgba(61, 63, 226, 0.12)' }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -right-24 w-72 h-72 rounded-full blur-3xl"
                style={{ background: 'rgba(198, 138, 31, 0.18)' }}
              />

              {/* Top stamp — eyebrow + tag */}
              <div className="relative flex items-center justify-between px-6 sm:px-7 pt-6 sm:pt-7 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/70 truncate"
                    style={{ fontFamily: monoFamily }}
                  >
                    {posterEyebrow}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-paper/80 backdrop-blur px-2.5 py-1 ring-1 ring-line text-[10px] font-bold uppercase tracking-[0.18em] text-ink flex-shrink-0"
                  style={{ fontFamily: monoFamily }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                  {posterTagline}
                </span>
              </div>

              {/* Illustration — flexible center band that fills remaining space */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-6 py-4">
                <img
                  src={illu.src}
                  alt={illu.alt}
                  className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none"
                  style={{
                    filter: 'drop-shadow(0 18px 30px rgba(20, 23, 42, 0.10))',
                  }}
                  draggable={false}
                />
              </div>

              {/* Headline + sub + signature */}
              <div className="relative px-6 sm:px-7 pb-6 sm:pb-7 flex-shrink-0">
                <h2
                  className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight leading-[1.1] mb-2"
                  style={{ fontFamily: displayFamily }}
                >
                  {posterHeadline}
                </h2>
                {posterSub && (
                  <p className="text-[13px] sm:text-[14px] text-ink-mute leading-relaxed max-w-md">
                    {posterSub}
                  </p>
                )}

                {/* Perforation divider */}
                <div className="mt-5 mb-4 flex items-center gap-3">
                  <div className="flex-1 border-t border-dashed border-ink/15" />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.24em] text-ink/45"
                    style={{ fontFamily: monoFamily }}
                  >
                    Admit one
                  </span>
                  <div className="flex-1 border-t border-dashed border-ink/15" />
                </div>

                {/* Wordmark / signature row */}
                <div className="flex items-center justify-between">
                  <Logo size={26} />
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55 tabular-nums"
                    style={{ fontFamily: monoFamily }}
                  >
                    Burkina Faso · 226
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
