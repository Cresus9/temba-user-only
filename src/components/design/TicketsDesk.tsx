import { useMemo, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarPlus,
  CaretLeft,
  CaretRight,
  CheckCircle,
  FilePdf,
  IdentificationCard,
  MapPin,
  PaperPlaneTilt,
  ShareNetwork,
  Sun,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import TicketPass from './TicketPass';
import { formatCalendarDate, formatEventTime } from '../../utils/formatters';
import { mapsSearchUrl, shortPlace } from '../../utils/eventGeo';
import { inferTicketTier, paymentMethodLabel, tierLabel, type TicketVisualState } from '../../utils/labels';
import AppBand from './AppBand';

export interface DeskTicket {
  id: string;
  eventTitle: string;
  eventDate?: string | null;
  eventTime?: string | null;
  venue?: string | null;
  city?: string | null;
  holder?: string | null;
  categoryName?: string | null;
  price?: number | null;
  qrValue?: string | null;
  ticketCode?: string | null;
  orderCode?: string | null;
  state?: TicketVisualState;
  image?: string | null;
}

interface TicketsDeskProps {
  tickets: DeskTicket[];
  paymentLabel?: string | null;
  paidAtLabel?: string | null;
  phoneHint?: string | null;
  emailHint?: string | null;
  total?: number | null;
  onDownload?: () => void;
  onCalendar?: () => void;
  onTransfer?: (ticket: DeskTicket) => void;
  onShare?: () => void;
}

function money(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return null;
  if (amount <= 0) return 'Prix bientôt disponible';
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

function maskPhone(phone?: string | null) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const local = digits.startsWith('226') ? digits.slice(3) : digits;
  if (local.length < 8) return null;
  return `+226 ${local.slice(0, 2)} •• •• ${local.slice(-2)}`;
}

export default function TicketsDesk({
  tickets,
  paymentLabel,
  paidAtLabel,
  phoneHint,
  emailHint,
  total,
  onDownload,
  onCalendar,
  onTransfer,
  onShare,
}: TicketsDeskProps) {
  const [filter, setFilter] = useState<'all' | 'vip' | 'pass'>('all');
  const [zoom, setZoom] = useState<number | null>(null);
  const first = tickets[0];
  const place = shortPlace(first?.venue, first?.city);

  const counts = useMemo(() => {
    let vip = 0;
    let pass = 0;
    tickets.forEach((ticket) => {
      const tier = inferTicketTier(ticket.categoryName, ticket.price);
      if (tier === 'vip' || tier === 'guest') vip += 1;
      else pass += 1;
    });
    return { vip, pass };
  }, [tickets]);

  const visible = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    const tier = inferTicketTier(ticket.categoryName, ticket.price);
    if (filter === 'vip') return tier === 'vip' || tier === 'guest';
    return tier !== 'vip' && tier !== 'guest';
  });

  const zoomTicket = zoom != null ? tickets[zoom] : null;
  const zoomPlace = shortPlace(zoomTicket?.venue, zoomTicket?.city);
  const dateLabel = first?.eventDate
    ? formatCalendarDate(first.eventDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const timeLabel = formatEventTime(first?.eventTime);
  const totalLabel = money(total ?? tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0));
  const phone = maskPhone(phoneHint);
  const delivery = [
    phone ? `SMS au ${phone}` : null,
    emailHint ? 'e-mail' : null,
  ].filter(Boolean);

  const share = () => {
    if (onShare) {
      onShare();
      return;
    }
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: first?.eventTitle || 'Temba', url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <div className="bg-paper">
      <section className="border-b border-line bg-surf">
        <div className="mx-auto max-w-[1200px] px-4 py-7 md:px-6 md:py-8">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0B7A52]">
            <CheckCircle size={20} weight="fill" />
            Paiement confirmé
            {paymentLabel ? ` · ${paymentMethodLabel(paymentLabel)}` : ''}
            {paidAtLabel ? ` · ${paidAtLabel}` : ''}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-ink md:text-[40px]">
            Vos billets <span className="font-semibold text-ink-3">({tickets.length})</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-ink-2">
            {delivery.length
              ? `Envoyés aussi par ${delivery.join(' et par ')}. `
              : ''}
            Gardez cette page, ou retrouvez-les dans Mes billets.
          </p>

          {first && (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-line bg-white p-3 md:flex-row md:items-center md:p-4">
              {first.image ? (
                <img src={first.image} alt="" className="h-[88px] w-full rounded-[10px] object-cover md:w-[132px]" />
              ) : null}
              <div className="min-w-0 flex-1">
                {(dateLabel || timeLabel) && (
                  <p className="text-[13px] font-semibold text-brand">
                    {[dateLabel, timeLabel].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="mt-0.5 font-display text-[20px] font-bold leading-tight tracking-tight">{first.eventTitle}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
                  <MapPin size={16} />
                  {place.label}
                  <a href={mapsSearchUrl(place.label)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand">
                    Itinéraire
                  </a>
                </p>
              </div>
              <div className="flex gap-6 border-line md:border-l md:pl-6">
                {first.orderCode ? (
                  <div>
                    <p className="text-[12px] text-ink-3">Commande</p>
                    <p className="font-mono text-[14px] font-semibold">{first.orderCode}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[12px] text-ink-3">Billets</p>
                  <p className="text-[15px] font-semibold">{tickets.length}</p>
                </div>
                {totalLabel ? (
                  <div>
                    <p className="text-[12px] text-ink-3">Total payé</p>
                    <p className="font-display text-[17px] font-bold tabular-nums">{totalLabel}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2 xl:hidden">
            <ActionIcon icon={<FilePdf size={22} />} label="PDF" primary onClick={onDownload || (() => window.print())} />
            <ActionIcon icon={<CalendarPlus size={22} />} label="Calendrier" onClick={onCalendar} />
            {onTransfer && first ? (
              <ActionIcon icon={<PaperPlaneTilt size={22} />} label="Transférer" onClick={() => onTransfer(first)} />
            ) : null}
            <ActionIcon icon={<ShareNetwork size={22} />} label="Partager" onClick={share} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] items-start gap-6 px-4 py-8 md:px-6 md:py-8 xl:grid-cols-[minmax(0,880px)_296px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-5 text-[15px]">
              <Tab on={filter === 'all'} onClick={() => setFilter('all')}>Tous · {tickets.length}</Tab>
              {counts.vip > 0 ? <Tab on={filter === 'vip'} onClick={() => setFilter('vip')}>VIP · {counts.vip}</Tab> : null}
              {counts.pass > 0 ? <Tab on={filter === 'pass'} onClick={() => setFilter('pass')}>Pass · {counts.pass}</Tab> : null}
            </div>
            <p className="text-[13px] text-ink-3">Un QR par personne · transférez ceux de vos invités</p>
          </div>

          <div className="flex flex-col items-center gap-5 md:items-stretch">
            {visible.map((ticket) => {
              const index = tickets.findIndex((item) => item.id === ticket.id);
              return (
                <div key={ticket.id} className="w-full max-w-[880px]">
                  <p className="mb-2 font-display text-[18px] font-bold md:hidden">
                    Billet {index + 1} sur {tickets.length}
                  </p>
                  <TicketPass
                    eventTitle={ticket.eventTitle}
                    eventDate={ticket.eventDate}
                    eventTime={ticket.eventTime}
                    venue={ticket.venue}
                    city={ticket.city}
                    holder={ticket.holder}
                    categoryName={ticket.categoryName}
                    price={ticket.price}
                    qrValue={ticket.qrValue}
                    ticketCode={ticket.ticketCode}
                    indexLabel={`${index + 1}/${tickets.length}`}
                    orderCode={ticket.orderCode}
                    state={ticket.state || 'valid'}
                    onEnlarge={() => setZoom(index)}
                  />
                  <button
                    type="button"
                    onClick={() => setZoom(index)}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-[14px] font-semibold md:hidden"
                  >
                    Agrandir le QR
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="no-print sticky top-6 hidden flex-col gap-4 xl:flex">
          <div className="rounded-2xl border border-line bg-white p-[18px]">
            <p className="font-display text-[16px] font-bold">Actions</p>
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" onClick={onDownload || (() => window.print())} className="btn btn-primary h-11 justify-start px-3">
                <FilePdf size={18} /> Télécharger le PDF
              </button>
              <button type="button" onClick={onCalendar} className="btn btn-secondary h-11 justify-start px-3">
                <CalendarPlus size={18} /> Ajouter au calendrier
              </button>
              {onTransfer && first ? (
                <button type="button" onClick={() => onTransfer(first)} className="btn btn-secondary h-11 justify-start px-3">
                  <PaperPlaneTilt size={18} /> Transférer
                </button>
              ) : null}
              <button type="button" onClick={share} className="btn btn-secondary h-11 justify-start px-3">
                <ShareNetwork size={18} /> Partager l’événement
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-[18px]">
            <p className="font-display text-[16px] font-bold">Le jour J</p>
            <ul className="mt-3 space-y-2.5 text-[14px] leading-snug text-ink-2">
              <li className="flex gap-2.5"><Sun size={18} className="mt-0.5 shrink-0 text-brand" /> Luminosité au maximum au moment du scan</li>
              <li className="flex gap-2.5"><FilePdf size={18} className="mt-0.5 shrink-0 text-brand" /> Téléphone chargé, ou PDF imprimé</li>
              <li className="flex gap-2.5"><IdentificationCard size={18} className="mt-0.5 shrink-0 text-brand" /> Pièce d’identité au nom du détenteur</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-[18px]">
            <p className="font-display text-[16px] font-bold">Besoin d’aide ?</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              WhatsApp ou téléphone<br />
              <b className="text-ink">+226 74 75 08 15</b><br />
              support@tembas.com
            </p>
            <a
              href="https://wa.me/22674750815"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary mt-3 h-10 w-full text-[14px]"
            >
              <WhatsappLogo size={18} /> Écrire sur WhatsApp
            </a>
          </div>
        </aside>
      </div>

      <section className="no-print px-5 py-8 md:px-10">
        <AppBand />
      </section>

      <div className="mx-4 mb-8 mt-4 rounded-2xl border border-line bg-white p-4 md:hidden">
        <p className="font-semibold">Besoin d’aide ?</p>
        <p className="text-[13px] text-ink-2">WhatsApp +226 74 75 08 15 · support@tembas.com</p>
        <a href="https://wa.me/22674750815" className="mt-2 inline-flex font-semibold text-brand">Écrire sur WhatsApp</a>
      </div>

      {zoomTicket && zoom != null && (
        <QrModal
          ticket={zoomTicket}
          index={zoom}
          total={tickets.length}
          place={zoomPlace.label}
          onClose={() => setZoom(null)}
          onPrev={() => setZoom((zoom - 1 + tickets.length) % tickets.length)}
          onNext={() => setZoom((zoom + 1) % tickets.length)}
        />
      )}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-1 font-semibold ${on ? 'border-ink text-ink' : 'border-transparent text-ink-3'}`}
    >
      {children}
    </button>
  );
}

function ActionIcon({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 text-[12px] font-medium">
      <span className={`grid h-[52px] w-[52px] place-items-center rounded-[14px] border ${primary ? 'border-brand bg-brand text-white' : 'border-line text-ink-2'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function QrModal({
  ticket,
  index,
  total,
  place,
  onClose,
  onPrev,
  onNext,
}: {
  ticket: DeskTicket;
  index: number;
  total: number;
  place: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const tier = inferTicketTier(ticket.categoryName, ticket.price);
  const dateLabel = ticket.eventDate
    ? formatCalendarDate(ticket.eventDate, { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const timeLabel = formatEventTime(ticket.eventTime);
  const [touchX, setTouchX] = useState<number | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#03061E]/90 px-5 text-white"
      onTouchStart={(event) => setTouchX(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => {
        if (touchX == null) return;
        const dx = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
        if (dx > 40) onPrev();
        if (dx < -40) onNext();
        setTouchX(null);
      }}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2 md:right-10 md:top-7">
        <span className="hidden items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[13px] md:inline-flex">
          <Sun size={16} /> Luminosité max
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
          <X size={18} />
        </button>
      </div>
      <div className="flex w-full max-w-[640px] items-center gap-4 md:gap-8">
        {total > 1 ? (
          <button type="button" onClick={onPrev} aria-label="Billet précédent" className="hidden h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white/10 md:grid">
            <CaretLeft size={22} />
          </button>
        ) : <span className="hidden w-[52px] md:block" />}
        <div className="w-full rounded-[20px] bg-white px-5 py-6 text-center text-ink md:px-8">
          <div className="flex items-center justify-between">
            <span className={`rounded-md px-2 py-1 text-[12px] font-extrabold uppercase ${tier === 'vip' || tier === 'guest' ? 'bg-[#F6B84A] text-ink' : 'bg-surf text-ink'}`}>
              {tierLabel(tier, ticket.categoryName)}
            </span>
            <span className="font-mono text-[13px] font-semibold text-ink-3">Billet {index + 1}/{total}</span>
          </div>
          <p className="mt-3 font-display text-[18px] font-bold leading-tight">{ticket.eventTitle}</p>
          <p className="mt-1 text-[14px] text-ink-3">{[dateLabel, timeLabel, place].filter(Boolean).join(' · ')}</p>
          <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3">
            {ticket.qrValue ? (
              <QRCodeSVG value={ticket.qrValue} size={300} level="M" includeMargin={false} />
            ) : (
              <div className="grid h-[300px] w-[300px] place-items-center text-ink-3">QR indisponible</div>
            )}
          </div>
          {ticket.holder ? <p className="mt-3 text-[15px] font-semibold">{ticket.holder}</p> : null}
          <p className="mt-1 font-mono text-[12px] text-ink-3">
            {ticket.ticketCode || '—'}{ticket.orderCode ? ` · Cmd ${ticket.orderCode}` : ''}
          </p>
        </div>
        {total > 1 ? (
          <button type="button" onClick={onNext} aria-label="Billet suivant" className="hidden h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white/10 md:grid">
            <CaretRight size={22} />
          </button>
        ) : <span className="hidden w-[52px] md:block" />}
      </div>
      <p className="mt-5 max-w-md text-center text-[14px] text-white/75">
        Présentez cet écran à l’entrée. Luminosité au maximum. Le QR reste lisible hors ligne.
        {total > 1 ? ' Balayez pour le billet suivant.' : ''}
      </p>
    </div>
  );
}
