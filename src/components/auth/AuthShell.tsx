import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TicketPass from '../design/TicketPass';

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

const monoFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Inter Tight", Inter, sans-serif';

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  backTo,
  backLabel,
  posterHeadline = 'Le même compte que l’app',
  posterSub = 'Vos billets achetés sur le site apparaissent dans l’app Temba, et inversement.',
}: AuthShellProps) {

  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 lg:items-center">
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
          <aside className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center gap-6 bg-surf border border-line rounded-2xl py-10">
            <div className="-rotate-3">
              <TicketPass
                eventTitle="Exemple de billet"
                eventDate="2026-12-18"
                eventTime="19:00"
                venue="Maison de la Culture"
                city="Bobo-Dioulasso"
                holder="Awa Ouédraogo"
                categoryName="VIP"
                price={5000}
                qrValue="https://tembas.com/exemple"
                ticketCode="EXEMPLE"
                indexLabel="1/1"
                orderCode="EXEMPLE"
                layout="phone"
              />
            </div>
            <div className="max-w-[320px] px-6 text-center">
              <h2 className="font-display text-[18px] font-bold" style={{ fontFamily: displayFamily }}>{posterHeadline}</h2>
              {posterSub && <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{posterSub}</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
