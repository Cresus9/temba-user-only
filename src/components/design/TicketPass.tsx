import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarX,
  CheckCircle,
  PaperPlaneTilt,
  ReceiptX,
  WifiSlash,
} from '@phosphor-icons/react';
import DomePattern from './DomePattern';
import Logo from '../brand/Logo';
import { formatCalendarDate, formatEventTime } from '../../utils/formatters';
import { shortPlace, mapsSearchUrl } from '../../utils/eventGeo';
import { inferTicketTier, ticketNameFr, tierLabel, type TicketTier, type TicketVisualState } from '../../utils/labels';

export interface TicketPassProps {
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
  indexLabel?: string | null;
  orderCode?: string | null;
  state?: TicketVisualState;
  tier?: TicketTier;
  onEnlarge?: () => void;
  /** Multi-day chips. Hidden when absent — needs a future DB field. */
  days?: { label: string; detail: string; state?: 'done' | 'today' | 'upcoming' }[];
  /** Scan place. Hidden when absent. */
  gate?: string | null;
  scannedDetail?: string | null;
  transferDetail?: string | null;
  width?: number;
  className?: string;
  /** `phone` keeps the vertical pass even on a wide screen (auth preview). */
  layout?: 'auto' | 'web' | 'phone';
}

function mapHead(tier: TicketTier, state: TicketVisualState) {
  const muted = state === 'scanned' || state === 'transferred' || state === 'cancelled';
  if (muted) return { variant: 'ticket-grey' as const, bg: '#62657A' };
  if (tier === 'guest') return { variant: 'ticket-ink' as const, bg: '#03061E' };
  return { variant: 'ticket-head' as const, bg: '#3D3FE2' };
}

export default function TicketPass({
  eventTitle,
  eventDate,
  eventTime,
  venue,
  city,
  holder,
  categoryName,
  price,
  qrValue,
  ticketCode,
  indexLabel,
  orderCode,
  state = 'valid',
  tier,
  onEnlarge,
  days,
  gate,
  scannedDetail,
  transferDetail,
  width = 342,
  className = '',
  layout = 'auto',
}: TicketPassProps) {
  const resolvedTier = tier ?? inferTicketTier(categoryName, price);
  const head = mapHead(resolvedTier, state);
  const category = tierLabel(resolvedTier, categoryName);
  const tagIsVip = resolvedTier === 'vip';
  const tagIsGuest = resolvedTier === 'guest';
  const dateLabel = eventDate
    ? formatCalendarDate(eventDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const timeLabel = formatEventTime(eventTime);
  const placeInfo = shortPlace(venue, city);
  const place = placeInfo.label;
  const directions = mapsSearchUrl(place);
  const muted = state === 'scanned' || state === 'transferred' || state === 'cancelled';
  const [clock, setClock] = useState('');
  const [wideScreen, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Africa/Ouagadougou',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const live =
    state === 'valid' || state === 'postponed' || state === 'offline' ? (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#0B7A52] shadow-[0_0_0_3px_rgba(11,122,82,0.18)]" />
        <span className="ticket-live-track relative h-2 w-[72px] overflow-hidden rounded-sm bg-[#ECECFD]">
          <span className="ticket-live-dot absolute inset-y-0 w-2 rounded-sm bg-brand" />
        </span>
        <b className="font-mono text-[12px] font-semibold tabular-nums">{clock}</b>
      </div>
    ) : (
      <p className={`text-[12px] font-semibold ${state === 'cancelled' ? 'text-[#C42B25]' : 'text-ink-3'}`}>
        {state === 'scanned' && 'Utilisé'}
        {state === 'transferred' && 'Transféré'}
        {state === 'cancelled' && 'Annulé'}
      </p>
    );

  const wide = layout === 'web' || (layout === 'auto' && wideScreen);

  if (wide) {
    return (
      <article
        data-ticket
        className={`ticket-pass relative flex w-full max-w-[880px] min-h-[288px] overflow-hidden rounded-2xl bg-white text-ink shadow-[0_1px_0_rgba(3,6,30,0.04),0_18px_40px_-18px_rgba(3,6,30,0.28)] ${className}`}
      >
        <div className="relative flex w-[268px] shrink-0 flex-col justify-between overflow-hidden px-5 py-[18px] text-white" style={{ background: head.bg }}>
          <DomePattern variant={head.variant} className="opacity-90" />
          <div className="relative flex items-start justify-between gap-2">
            <Logo variant="onBlue" size={18} />
            {tagIsVip ? (
              <span className="font-display text-[32px] font-extrabold leading-none tracking-tight text-[#F6B84A]">VIP</span>
            ) : (
              <span
                className={`rounded-md border-[1.5px] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                  tagIsGuest ? 'border-[#F6B84A] text-[#F6B84A]' : 'border-white/75 text-white'
                }`}
              >
                {category}
              </span>
            )}
          </div>
          <div className="relative mt-4">
            <h3 className="font-display text-[20px] font-bold leading-[1.08] tracking-[-0.02em]">{eventTitle}</h3>
            <div className="mt-4 flex gap-5">
              {dateLabel ? (
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">Date</span>
                  <b className={`mt-0.5 block text-[14px] font-semibold ${state === 'postponed' ? 'line-through opacity-70' : ''}`}>{dateLabel}</b>
                </div>
              ) : null}
              {timeLabel ? (
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">Ouverture</span>
                  <b className="mt-0.5 block text-[14px] font-semibold">{timeLabel}</b>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col px-5 py-4">
          {(resolvedTier === 'vip' || resolvedTier === 'guest') && (
            <div className="absolute inset-y-0 left-0 w-[3px] bg-[#F6B84A]" />
          )}
          {state === 'postponed' && (
            <p className="mb-3 rounded-lg bg-[#FFF5E0] px-3 py-2 text-[13px] text-[#8A5A00]">
              <b className="font-semibold">Événement reporté.</b> Billet valable pour la nouvelle date.
            </p>
          )}
          {state === 'offline' && (
            <p className="mb-3 rounded-lg bg-[#E6F4EE] px-3 py-2 text-[13px] text-[#0B7A52]">
              <b className="font-semibold">Hors ligne.</b> Scannable sans réseau.
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {holder ? (
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Détenteur</dt>
                <dd className="mt-0.5 truncate text-[15px] font-semibold">{holder}</dd>
              </div>
            ) : null}
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Catégorie</dt>
              <dd className="mt-0.5 text-[15px] font-semibold leading-snug">
                {ticketNameFr(categoryName) || category}
                {typeof price === 'number' && price > 0 ? (
                  <span className="ml-1 font-medium text-ink-2">{price.toLocaleString('fr-FR')} FCFA</span>
                ) : null}
              </dd>
            </div>
            {place ? (
              <div className="col-span-2 min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Lieu</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
                  <span>{place}</span>
                  <a href={directions} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-brand">
                    Itinéraire
                  </a>
                </dd>
              </div>
            ) : null}
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Billet</dt>
              <dd className="mt-0.5 truncate font-mono text-[13px] font-semibold">{ticketCode || '—'}{indexLabel ? ` · ${indexLabel}` : ''}</dd>
            </div>
            {orderCode ? (
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Commande</dt>
                <dd className="mt-0.5 truncate font-mono text-[13px] font-semibold">{orderCode}</dd>
              </div>
            ) : null}
          </dl>
          <footer className="mt-auto flex items-center justify-between pt-3 text-[12px] font-medium text-ink-3">
            <span>Billet nominatif · 1 QR = 1 entrée</span>
            <Logo variant="mark" size={16} className={muted ? 'opacity-50 grayscale' : ''} />
          </footer>
        </div>

        <div className="relative w-0 shrink-0">
          <span className="absolute inset-y-3 left-0 border-l-2 border-dashed border-line" />
          <span className="absolute -left-[11px] -top-[11px] h-[22px] w-[22px] rounded-full bg-white shadow-[inset_0_-1px_0_#E6E7EE]" />
          <span className="absolute -bottom-[11px] -left-[11px] h-[22px] w-[22px] rounded-full bg-white shadow-[inset_0_1px_0_#E6E7EE]" />
        </div>

        <div className="relative flex w-[216px] shrink-0 flex-col items-center justify-between px-3 py-4">
          <div className={`rounded-lg bg-white p-2 ${muted ? 'opacity-[0.18] blur-[1px]' : ''}`}>
            {qrValue ? (
              <QRCodeSVG value={qrValue} size={156} level="M" includeMargin={false} />
            ) : (
              <div className="grid h-[156px] w-[156px] place-items-center text-[12px] text-ink-3">QR indisponible</div>
            )}
          </div>
          {live}
          <div className="text-center font-mono text-[11px] text-ink-3">
            {ticketCode || '—'}
          </div>
          <button
            type="button"
            onClick={onEnlarge}
            className="text-[13px] font-semibold text-brand"
          >
            Agrandir
          </button>
          {state === 'scanned' && (
            <div className="absolute inset-x-2 top-16 text-center">
              <b className="font-display text-[16px]">Déjà scanné</b>
            </div>
          )}
          {state === 'transferred' && (
            <div className="absolute inset-x-2 top-16 text-center">
              <b className="font-display text-[16px]">Transféré</b>
            </div>
          )}
          {state === 'cancelled' && (
            <div className="absolute inset-x-2 top-16 text-center text-[#C42B25]">
              <b className="font-display text-[16px]">Annulé</b>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      data-ticket
      className={`ticket-pass relative overflow-hidden rounded-2xl bg-white text-ink shadow-[0_1px_0_rgba(3,6,30,0.04),0_12px_32px_-12px_rgba(3,6,30,0.22)] ${className}`}
      style={{ width, maxWidth: '100%' }}
    >
      <header className="relative overflow-hidden px-[18px] pb-[18px] pt-4 text-white" style={{ background: head.bg }}>
        <DomePattern variant={head.variant} className="opacity-90" />
        <div className="relative flex items-start justify-between gap-3">
          <Logo variant="onBlue" size={18} className="mt-1" />
          {tagIsVip ? (
            <span className="font-display text-[34px] font-extrabold leading-none tracking-tight text-[#F6B84A]">VIP</span>
          ) : (
            <span
              className={`rounded-md border-[1.5px] px-2 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] ${
                tagIsGuest ? 'border-[#F6B84A] text-[#F6B84A]' : 'border-white/75 text-white'
              }`}
            >
              {category}
            </span>
          )}
        </div>
        <h3 className="relative mt-4 max-w-[92%] font-display text-[26px] font-bold leading-[1.04] tracking-[-0.025em]">
          {eventTitle}
        </h3>
        <div className="relative mt-3.5 flex gap-5">
          {dateLabel && (
            <div>
              <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-white/80">Date</span>
              <b className={`mt-0.5 block text-[17px] font-semibold ${state === 'postponed' ? 'line-through opacity-70' : ''}`}>
                {dateLabel}
              </b>
            </div>
          )}
          {timeLabel && (
            <div>
              <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-white/80">Ouverture</span>
              <b className="mt-0.5 block text-[17px] font-semibold">{timeLabel}</b>
            </div>
          )}
        </div>
      </header>

      {resolvedTier === 'vip' || resolvedTier === 'guest' ? (
        <div className="h-[3px] bg-[#F6B84A]" />
      ) : null}

      <div className="relative px-[18px] pt-4">
        {state === 'postponed' && (
          <div className="mb-3.5 flex gap-2.5 rounded-[10px] bg-[#FFF5E0] px-3 py-2.5 text-[13.5px] leading-snug text-[#8A5A00]">
            <CalendarX size={18} className="mt-0.5 shrink-0" />
            <p><b className="font-semibold">Événement reporté.</b> Votre billet reste valable pour la nouvelle date, communiquée par l’organisateur.</p>
          </div>
        )}
        {state === 'offline' && (
          <div className="mb-3.5 flex gap-2.5 rounded-[10px] bg-[#E6F4EE] px-3 py-2.5 text-[13.5px] leading-snug text-[#0B7A52]">
            <WifiSlash size={18} className="mt-0.5 shrink-0" />
            <p><b className="font-semibold">Hors ligne.</b> Billet enregistré sur ce téléphone, scannable sans réseau.</p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          {holder ? (
            <div className="min-w-0">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Détenteur</dt>
              <dd className="mt-1 truncate text-[16px] font-semibold">{holder}</dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Catégorie</dt>
            <dd className="mt-1 truncate text-[16px] font-semibold">{ticketNameFr(categoryName) || category}</dd>
          </div>
          {place ? (
            <div className="col-span-2 min-w-0">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Lieu</dt>
              <dd className="mt-1 text-[16px] font-semibold leading-snug">
                {place}
                <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[13px] font-semibold text-brand">
                  Itinéraire
                </a>
              </dd>
            </div>
          ) : null}
          {gate ? (
            <div className="min-w-0">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Entrée</dt>
              <dd className="mt-1 truncate text-[16px] font-semibold">{gate}</dd>
            </div>
          ) : null}
        </dl>

        {days && days.length > 0 ? (
          <div className="mt-3.5 flex gap-1.5">
            {days.map((day) => (
              <div
                key={day.label}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-semibold leading-tight ${
                  day.state === 'today' ? 'border-brand shadow-[0_0_0_3px_#ECECFD]' : 'border-line'
                } ${day.state === 'done' ? 'bg-surf text-ink-3' : ''}`}
              >
                {day.label}
                <small className={`mt-0.5 block text-[11.5px] font-medium ${day.state === 'today' ? 'text-brand' : 'text-ink-3'}`}>
                  {day.detail}
                </small>
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative mt-[18px] border-t-2 border-dashed border-line">
          <span className="absolute -left-[29px] -top-[12px] h-[22px] w-[22px] rounded-full bg-[#F4F5FA]" />
          <span className="absolute -right-[29px] -top-[12px] h-[22px] w-[22px] rounded-full bg-[#F4F5FA]" />
        </div>
      </div>

      <div className="relative flex flex-col items-center px-[18px] pb-4 pt-[18px]">
        <div className={`rounded-xl bg-white p-[18px] ${muted ? 'opacity-[0.18] blur-[1px]' : ''}`}>
          {qrValue ? (
            <QRCodeSVG value={qrValue} size={196} level="M" includeMargin={false} />
          ) : (
            <div className="grid h-[196px] w-[196px] place-items-center text-[13px] text-ink-3">QR indisponible</div>
          )}
        </div>

        {state === 'valid' || state === 'postponed' || state === 'offline' ? (
          <div className="mt-3 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#0B7A52] shadow-[0_0_0_3px_rgba(11,122,82,0.18)]" />
            <span className="ticket-live-track relative h-2 w-[120px] overflow-hidden rounded-sm bg-[#ECECFD]">
              <span className="ticket-live-dot absolute inset-y-0 w-2 rounded-sm bg-brand" />
            </span>
            <b className="font-mono text-[13px] font-semibold tabular-nums">{clock}</b>
          </div>
        ) : (
          <p className={`mt-3 text-[13px] font-semibold ${state === 'cancelled' ? 'text-[#C42B25]' : 'text-ink-3'}`}>
            {state === 'scanned' && 'Utilisé · non réutilisable'}
            {state === 'transferred' && 'QR désactivé sur ce téléphone'}
            {state === 'cancelled' && 'Billet annulé'}
          </p>
        )}

        <div className="mt-3.5 flex w-full justify-between border-t border-line pt-3 font-mono text-[12px] text-ink-3">
          <span>Billet <b className="font-semibold text-ink">{ticketCode || '—'}</b>{indexLabel ? ` · ${indexLabel}` : ''}</span>
          {orderCode ? <span>Cmd <b className="font-semibold text-ink">{orderCode}</b></span> : null}
        </div>

        {state === 'scanned' && (
          <div className="absolute inset-x-4 bottom-16 flex flex-col items-center text-center">
            <span className="mb-1.5 grid h-[52px] w-[52px] place-items-center rounded-full bg-surf text-ink-2">
              <CheckCircle size={26} weight="bold" />
            </span>
            <b className="font-display text-[18px]">Déjà scanné</b>
            {scannedDetail ? <p className="mt-1 text-[13.5px] text-ink-2">{scannedDetail}</p> : null}
          </div>
        )}
        {state === 'transferred' && (
          <div className="absolute inset-x-4 bottom-16 flex flex-col items-center text-center">
            <span className="mb-1.5 grid h-[52px] w-[52px] place-items-center rounded-full bg-[#ECECFD] text-brand">
              <PaperPlaneTilt size={26} weight="bold" />
            </span>
            <b className="font-display text-[18px]">Transféré</b>
            {transferDetail ? <p className="mt-1 text-[13.5px] text-ink-2">{transferDetail}</p> : null}
          </div>
        )}
        {state === 'cancelled' && (
          <div className="absolute inset-x-4 bottom-16 flex flex-col items-center text-center">
            <span className="mb-1.5 grid h-[52px] w-[52px] place-items-center rounded-full bg-[#FCEBEA] text-[#C42B25]">
              <ReceiptX size={26} weight="bold" />
            </span>
            <b className="font-display text-[18px]">Annulé · remboursé</b>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-[18px] pb-3.5 text-[12px] font-medium text-ink-3">
        <span>Billet nominatif · 1 QR = 1 entrée</span>
        <Logo variant="mark" size={16} className={muted ? 'opacity-50 grayscale' : ''} />
      </footer>
    </article>
  );
}
