import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Ticket,
  Star,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Maximize2,
  ExternalLink,
  X,
} from 'lucide-react';
import ResponsiveQRCode from './ResponsiveQRCode';
import TransferTicketModal from './TransferTicketModal';
import { formatCurrency } from '../../utils/formatters';

interface EnhancedFestivalTicketProps {
  ticketHolder: string;
  ticketType: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  qrCode: string;
  eventImage?: string;
  price?: number;
  currency?: string;
  className?: string;
  orderNumber?: string;
  purchaseDate?: string;
  eventCategory?: string;
  specialInstructions?: string;
  ticketStatus?: string;
  scannedAt?: string;
  scannedBy?: string;
  scanLocation?: string;
  onTransferComplete?: () => void;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

/* --------------------------- helpers --------------------------- */

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateLong = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateMono = (dateString: string) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d
    .toLocaleDateString('en-US', { month: 'short' })
    .toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const isVipTier = (type: string) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('vip') || t.includes('premium') || t.includes('gold') || t.includes('platine');
};

/* status mapping → semantic color tokens (no rainbow) */
const getStatusMeta = (status: string) => {
  switch (status) {
    case 'USED':
      return {
        label: 'Utilisé',
        ring: 'ring-ink/20',
        bg: 'bg-ink',
        text: 'text-paper',
        Icon: CheckCircle2,
        chipCls: 'bg-cream text-ink-mute ring-line',
        bandCls: 'bg-cream text-ink-mute border-line',
        dotCls: 'bg-ink-mute',
      };
    case 'VALID':
      return {
        label: 'Valide',
        ring: 'ring-green-500/30',
        bg: 'bg-green-600',
        text: 'text-paper',
        Icon: CheckCircle2,
        chipCls: 'bg-green-50 text-green-700 ring-green-200',
        bandCls: 'bg-green-50 text-green-800 border-green-200',
        dotCls: 'bg-green-500',
      };
    case 'EXPIRED':
      return {
        label: 'Expiré',
        ring: 'ring-amber-500/30',
        bg: 'bg-amber-500',
        text: 'text-paper',
        Icon: AlertCircle,
        chipCls: 'bg-amber-50 text-amber-800 ring-amber-200',
        bandCls: 'bg-amber-50 text-amber-800 border-amber-200',
        dotCls: 'bg-amber-500',
      };
    case 'CANCELLED':
    case 'REFUNDED':
      return {
        label: status === 'REFUNDED' ? 'Remboursé' : 'Annulé',
        ring: 'ring-red-500/30',
        bg: 'bg-red-600',
        text: 'text-paper',
        Icon: XCircle,
        chipCls: 'bg-red-50 text-red-700 ring-red-200',
        bandCls: 'bg-red-50 text-red-800 border-red-200',
        dotCls: 'bg-red-500',
      };
    case 'PENDING':
      return {
        label: 'En attente',
        ring: 'ring-amber-500/30',
        bg: 'bg-amber-500',
        text: 'text-paper',
        Icon: Clock,
        chipCls: 'bg-amber-50 text-amber-800 ring-amber-200',
        bandCls: 'bg-amber-50 text-amber-800 border-amber-200',
        dotCls: 'bg-amber-500',
      };
    default:
      return {
        label: 'Valide',
        ring: 'ring-green-500/30',
        bg: 'bg-green-600',
        text: 'text-paper',
        Icon: CheckCircle2,
        chipCls: 'bg-green-50 text-green-700 ring-green-200',
        bandCls: 'bg-green-50 text-green-800 border-green-200',
        dotCls: 'bg-green-500',
      };
  }
};

/* ---------------- atoms ---------------- */

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p
    className={`text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute ${className}`}
    style={{ fontFamily: monoFamily }}
  >
    {children}
  </p>
);

const InfoCell: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}> = ({ label, value, mono = false, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <Eyebrow className="!mb-1.5">{label}</Eyebrow>
    <p
      className={`text-[14px] sm:text-[15px] font-bold text-ink break-words ${
        mono ? 'tabular-nums' : ''
      }`}
      style={{
        fontFamily: mono ? monoFamily : displayFamily,
        lineHeight: 1.45,
        paddingBottom: 3,
      }}
      title={typeof value === 'string' ? value : undefined}
    >
      {value}
    </p>
  </div>
);

/* ---------------------------- main ----------------------------- */

export default function EnhancedFestivalTicket({
  ticketHolder,
  ticketType,
  ticketId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  qrCode,
  eventImage,
  price,
  currency = 'XOF',
  className = '',
  orderNumber,
  purchaseDate,
  eventCategory,
  specialInstructions,
  ticketStatus = 'VALID',
  scannedAt,
  scannedBy,
  scanLocation,
  onTransferComplete,
}: EnhancedFestivalTicketProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const tktCode = ticketId.slice(0, 8).toUpperCase();
  const status = getStatusMeta(ticketStatus);
  const StatusIcon = status.Icon;
  const isVip = isVipTier(ticketType);
  const isUsed = ticketStatus === 'USED';

  const mapsHref = eventLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventLocation)}`
    : undefined;

  return (
    <div className={`relative w-full max-w-3xl mx-auto ${className}`}>
      {/* The ticket */}
      <article
        data-ticket-card
        className="relative bg-paper rounded-[22px] overflow-hidden ring-1 ring-line"
        style={{
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(15,23,42,0.04), 0 16px 48px -18px rgba(15,23,42,0.30), 0 4px 12px -6px rgba(15,23,42,0.10)',
        }}
      >
        {/* ── Header / Hero ── */}
        <header className="relative bg-ink overflow-hidden">
          {/* Poster image */}
          {eventImage && (
            <img
              src={eventImage}
              alt={eventTitle}
              onLoad={() => setImageLoaded(true)}
              crossOrigin="anonymous"
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
            />
          )}

          {/* Top contrast band — guarantees the "TEMBA TICKETS / status" row
              is legible regardless of poster content */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-20"
            style={{
              background:
                'linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.20) 70%, rgba(15,23,42,0) 100%)',
            }}
          />

          {/* Cinematic dark scrim — bottom→top, ensures title contrast */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.40) 45%, rgba(15,23,42,0.94) 100%)',
            }}
          />

          {/* Top corner row — eyebrow + status pill */}
          <div className="relative flex items-start justify-between px-4 sm:px-7 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-5 rounded-full bg-accent flex-shrink-0" />
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-paper/85"
                style={{ fontFamily: monoFamily }}
              >
                Temba Tickets
                <span className="mx-2 text-paper/40">·</span>
                <span className="text-accent">Admit one</span>
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ${status.chipCls}`}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {status.label}
            </span>
          </div>

          {/* VIP ribbon (only for VIP/Premium tiers) */}
          {isVip && (
            <div
              aria-hidden
              className="hidden sm:flex absolute -top-1 right-7 flex-col items-center"
            >
              <div className="bg-accent text-ink px-2 py-3 shadow-card flex flex-col items-center">
                <Star className="h-3 w-3 fill-current mb-1" />
                <span
                  className="text-[9px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ fontFamily: monoFamily, writingMode: 'vertical-rl' }}
                >
                  VIP
                </span>
              </div>
              {/* Ribbon tail */}
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '8px solid rgb(255 209 102)',
                }}
              />
            </div>
          )}

          {/* Hero spacer (image-only zone) */}
          <div className="relative h-20 sm:h-32 md:h-40" />

          {/* Title plate */}
          <div className="relative px-4 sm:px-7 pb-4 sm:pb-6">
            <div className="max-w-[88%]">
              {eventCategory && (
                <p
                  className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-accent mb-1.5 sm:mb-2"
                  style={{ fontFamily: monoFamily }}
                >
                  {eventCategory}
                </p>
              )}
              <h2
                className="text-[17px] sm:text-[24px] md:text-[28px] font-bold text-paper tracking-tight line-clamp-3 pb-0.5"
                style={{
                  fontFamily: displayFamily,
                  textShadow: '0 1px 24px rgba(0,0,0,0.45)',
                  lineHeight: 1.18,
                }}
              >
                {eventTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 mt-2 sm:mt-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] text-paper/90 tabular-nums"
                  style={{ fontFamily: monoFamily }}
                >
                  <Calendar className="h-3 w-3 text-accent" />
                  {formatDateMono(eventDate)}
                </span>
                <span aria-hidden className="text-paper/30">
                  ·
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] text-paper/90 tabular-nums"
                  style={{ fontFamily: monoFamily }}
                >
                  <Clock className="h-3 w-3 text-accent" />
                  {eventTime}
                </span>
                {price != null && (
                  <>
                    <span aria-hidden className="text-paper/30">
                      ·
                    </span>
                    <span
                      className="inline-flex items-center text-[11px] sm:text-[12px] font-bold text-paper tabular-nums"
                      style={{ fontFamily: monoFamily }}
                    >
                      {formatCurrency(price, currency)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Perforation row ── clean dashed divider with subtle accent dots */}
        <div className="relative bg-paper" aria-hidden>
          <div
            className="mx-5 sm:mx-7 border-t border-dashed border-line"
            style={{ borderTopWidth: 1.5 }}
          />
          {/* Tiny accent dots at each end — tactile detail without backdrop dependency */}
          <span className="absolute left-3 sm:left-4 top-0 -translate-y-1/2 w-1 h-1 rounded-full bg-line" />
          <span className="absolute right-3 sm:right-4 top-0 -translate-y-1/2 w-1 h-1 rounded-full bg-line" />
        </div>

        {/* ── Body ── */}
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_280px] gap-0 bg-paper">
          {/* Main stub — info */}
          <div className="px-4 sm:px-7 py-4 sm:py-6 md:border-r md:border-dashed md:border-line">
            {/* Data grid — adapts to body width (2 cols when QR is on the side) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3.5 sm:gap-y-5 gap-x-4 sm:gap-x-5 pb-4 sm:pb-5 border-b border-dashed border-line">
              <InfoCell
                label="Détenteur"
                value={
                  <span className="capitalize">{ticketHolder || '—'}</span>
                }
              />
              <InfoCell
                label="Date"
                value={formatDateMono(eventDate)}
                mono
              />
              <InfoCell label="Heure" value={eventTime || '—'} mono />
              <InfoCell
                label="Catégorie"
                value={
                  <span className="inline-flex items-center gap-1">
                    {isVip && (
                      <Star className="h-3 w-3 text-accent fill-current flex-shrink-0" />
                    )}
                    <span className="truncate">{ticketType || '—'}</span>
                  </span>
                }
              />
            </div>

            {/* Location */}
            <div className="mt-4 sm:mt-5">
              <Eyebrow className="!mb-1.5">Lieu de l'événement</Eyebrow>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="grid place-items-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 flex-shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] sm:text-[14px] font-bold text-ink leading-snug"
                    style={{ fontFamily: displayFamily }}
                  >
                    {eventLocation || 'Lieu non précisé'}
                  </p>
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-brand hover:text-brand-700 transition-colors"
                      style={{ fontFamily: monoFamily }}
                    >
                      Ouvrir dans Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Special instructions */}
            {specialInstructions && (
              <div className="mt-5 pt-5 border-t border-dashed border-line">
                <Eyebrow className="!mb-1.5">Avant l'événement</Eyebrow>
                <p className="text-[12px] text-ink-mute leading-relaxed">
                  {specialInstructions}
                </p>
              </div>
            )}

            {/* Used-status callout */}
            {isUsed && (
              <div
                className={`mt-5 p-3 rounded-lg flex items-start gap-2.5 border ${status.bandCls}`}
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p
                    className="font-bold tracking-tight mb-0.5"
                    style={{ fontFamily: displayFamily }}
                  >
                    Billet déjà scanné
                  </p>
                  <p
                    className="tabular-nums"
                    style={{ fontFamily: monoFamily }}
                  >
                    {scannedAt
                      ? new Date(scannedAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                    {scanLocation ? ` · ${scanLocation}` : ''}
                    {scannedBy ? ` · par ${scannedBy}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QR Stub */}
          <aside
            className="relative bg-cream/50 px-4 sm:px-7 py-4 sm:py-6 border-t border-dashed border-line md:border-t-0"
            data-ticket-stub
          >
            <div className="mx-auto w-full max-w-[240px] flex flex-col items-center text-center">
              {/* "ADMIT ONE" stamp */}
              <div className="w-full flex items-center justify-between mb-2.5 sm:mb-3">
                <Eyebrow>Admission</Eyebrow>
                <span
                  className="text-[10px] font-bold tabular-nums text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  01 / 01
                </span>
              </div>

              {/* QR cushion — sized to the actual QR (200px mobile / 170px sm+) + padding */}
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="group relative block p-3 bg-paper rounded-xl2 ring-1 ring-line hover:ring-brand transition-all active:scale-[0.99] cursor-pointer"
                title="Cliquez pour agrandir le QR code"
              >
                <div className="flex items-center justify-center bg-paper">
                  <ResponsiveQRCode
                    ticketId={ticketId}
                    baseSize={170}
                    level="H"
                    includeMargin={false}
                    fgColor="#0F172A"
                    bgColor="#FFFFFF"
                  />
                </div>
                {/* Used overlay */}
                {isUsed && (
                  <div className="absolute inset-3 grid place-items-center rounded-lg pointer-events-none">
                    <span
                      className="px-3 py-1.5 rounded-md bg-ink/85 text-paper text-[10px] font-extrabold uppercase tracking-[0.2em] -rotate-12"
                      style={{ fontFamily: monoFamily }}
                    >
                      Utilisé
                    </span>
                  </div>
                )}
                {/* Maximize hint */}
                <div className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-md bg-ink/0 group-hover:bg-ink/85 transition-colors">
                  <Maximize2 className="h-3 w-3 text-ink/0 group-hover:text-paper transition-colors" />
                </div>
              </button>

              {/* Ticket ID */}
              <div className="mt-3 sm:mt-4">
                <Eyebrow className="!mb-1">Ticket ID</Eyebrow>
                <p
                  className="text-[16px] sm:text-[18px] font-bold tracking-[0.14em] text-ink tabular-nums"
                  style={{ fontFamily: monoFamily }}
                >
                  {tktCode}
                </p>
              </div>

              {/* Verified badge */}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <div className="grid place-items-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-600 text-paper">
                  <Shield className="h-2.5 w-2.5" />
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Sécurisé · Authentique
                </span>
              </div>

              {/* Order number */}
              {orderNumber && (
                <div className="w-full mt-3 pt-3 border-t border-dashed border-line">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute/85 tabular-nums"
                    style={{ fontFamily: monoFamily }}
                  >
                    ORD · {orderNumber.slice(0, 8).toUpperCase()}
                  </p>
                  {purchaseDate && (
                    <p
                      className="text-[10px] text-ink-mute/70 mt-0.5 tabular-nums"
                      style={{ fontFamily: monoFamily }}
                    >
                      Acheté le {formatDateMono(purchaseDate)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ── Footer strip ── */}
        <footer
          className={`relative px-4 sm:px-7 py-2.5 sm:py-3 border-t border-line ${status.bandCls}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${status.dotCls} ${
                  ticketStatus === 'VALID' ? 'animate-ping' : ''
                }`}
              />
              <span
                className={`relative -ml-2 inline-block w-1.5 h-1.5 rounded-full ${status.dotCls}`}
              />
              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ fontFamily: monoFamily }}
              >
                Statut · {status.label}
              </p>
            </div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute hidden sm:block"
              style={{ fontFamily: monoFamily }}
            >
              Powered by{' '}
              <span
                className="text-ink"
                style={{ fontFamily: displayFamily, letterSpacing: '0.02em' }}
              >
                TEMBA
              </span>
            </p>
          </div>
        </footer>
      </article>

      {/* QR Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 bg-ink/80 backdrop-blur-sm grid place-items-center z-[9998] p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-paper rounded-xl2 max-w-md w-full overflow-hidden shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute tabular-nums"
                  style={{ fontFamily: monoFamily }}
                >
                  TKT · {tktCode}
                </p>
                <h3
                  className="text-[14px] font-bold text-ink leading-tight"
                  style={{ fontFamily: displayFamily }}
                >
                  Code QR du billet
                </h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="grid place-items-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-ink hover:border-ink transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-5">
              <div className="bg-cream/60 p-5 rounded-xl2 ring-1 ring-line flex justify-center">
                <div className="bg-paper p-3 rounded-lg ring-1 ring-line">
                  <ResponsiveQRCode
                    ticketId={ticketId}
                    baseSize={300}
                    level="H"
                    includeMargin={false}
                    fgColor="#0F172A"
                    bgColor="#FFFFFF"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-[12px] text-ink-mute leading-relaxed">
                Présentez ce code à l'entrée. Une seule entrée autorisée.
              </p>
            </div>

            <footer className="px-5 py-3 bg-cream border-t border-line flex justify-end">
              <button
                onClick={() => setShowQRModal(false)}
                className="inline-flex items-center justify-center h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
              >
                Fermer
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferTicketModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        ticketId={ticketId}
        ticketTitle={eventTitle}
        onTransferComplete={() => {
          setShowTransferModal(false);
          onTransferComplete?.();
        }}
      />
    </div>
  );
}
