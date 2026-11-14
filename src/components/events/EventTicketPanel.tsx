import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarBlank, Lock, Minus, Plus, WhatsappLogo } from '@phosphor-icons/react';
import type { Event, TicketType } from '../../types/event';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';
import { formatCurrency, formatCalendarDate, calendarDayInZone, formatEventTime } from '../../utils/formatters';
import { addDays } from '../../utils/eventDisplay';
import VisitDateCalendar from '../venue/VisitDateCalendar';

const TZ = 'Africa/Ouagadougou';

export interface PanelDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
}

type Mode = 'open' | 'date' | 'soon' | 'none' | 'sold' | 'ended';

function paid(ticket: TicketType) {
  return Number(ticket.price) > 0;
}

function configured(ticket: TicketType) {
  return Number(ticket.quantity) > 0;
}

function onSale(ticket: TicketType) {
  return ticket.sales_enabled === true && paid(ticket) && configured(ticket) && Number(ticket.available) > 0 && ticket.is_paused !== true;
}

export function ticketMode(event: Event, dates: PanelDate[], today = calendarDayInZone(TZ)): Mode {
  const types = event.ticket_types ?? [];
  const last = dates.length ? dates[dates.length - 1].date : event.date;
  if (!event.is_permanent && last && last < today) return 'ended';
  if (event.is_permanent) {
    if (types.some(onSale)) return 'date';
    if (types.some(paid)) return 'soon';
    return 'none';
  }
  const selling = types.filter(onSale);
  if (selling.length > 0) return 'open';
  const priced = types.filter(paid);
  const fullySold = priced.length > 0 && priced.every((ticket) => configured(ticket) && ticket.sales_enabled === true && Number(ticket.available) <= 0);
  if (fullySold) return 'sold';
  if (priced.length > 0) return 'soon';
  return 'none';
}

function showNote(text?: string | null) {
  const value = (text || '').trim();
  if (!value) return '';
  if (/[àâäéèêëïîôùûüç]/i.test(value) || /billet|entrée|acces|accès|inclus|soirée|place|visite/i.test(value)) return value;
  return '';
}

function shortDay(iso: string, today: string) {
  if (iso === today) return 'Auj.';
  return formatCalendarDate(iso, { weekday: 'short', day: 'numeric' }, TZ).replace('.', '');
}

export default function EventTicketPanel({
  event,
  dates,
}: {
  event: Event;
  dates: PanelDate[];
}) {
  const navigate = useNavigate();
  const today = calendarDayInZone(TZ);
  const mode = ticketMode(event, dates, today);
  const types = event.ticket_types ?? [];
  const [qty, setQty] = useState<Record<string, number>>({});
  const [day, setDay] = useState(today);
  const [dateId, setDateId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(today, index)), [today]);

  const selections = useMemo(
    () => Object.entries(qty)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticket_type_id, quantity]) => ({
        ticket_type_id,
        quantity,
        price: Number(types.find((ticket) => ticket.id === ticket_type_id)?.price || 0),
      })),
    [qty, types],
  );
  const { fees } = useFeeCalculation(event.id, selections);
  const subtotal = selections.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (fees.total_buyer_fees || 0);
  const count = selections.reduce((sum, item) => sum + item.quantity, 0);
  const openTiers = types.filter(onSale);
  const minOpen = openTiers.length ? Math.min(...openTiers.map((ticket) => Number(ticket.price))) : 0;

  const pickDay = (iso: string) => {
    setDay(iso);
    setDateId(dates.find((row) => row.date.split('T')[0] === iso)?.id ?? null);
  };

  const change = (ticket: TicketType, delta: number) => {
    const cap = Math.max(1, Math.min(ticket.max_per_order || 10, Number(ticket.available) || ticket.max_per_order || 10));
    setQty((prev) => {
      const next = Math.min(cap, Math.max(0, (prev[ticket.id] || 0) + delta));
      return { ...prev, [ticket.id]: next };
    });
  };

  const buy = () => {
    if (count === 0) return;
    const chosen = mode === 'date' ? dates.find((row) => row.date.split('T')[0] === day) : dates[0];
    navigate('/checkout', {
      state: {
        tickets: Object.fromEntries(selections.map((item) => [item.ticket_type_id, item.quantity])),
        totals: { subtotal, processingFee: 0, total },
        currency: event.currency,
        eventId: event.id,
        eventDateId: dateId || chosen?.id || null,
        ...(mode === 'date' ? { isPermanent: true, visitDate: day, addonTotal: 0 } : {}),
      },
    });
  };

  const share = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  const dateChip = mode === 'date'
    ? formatCalendarDate(day, { weekday: 'short', day: 'numeric', month: 'short' }, TZ)
    : dates[0]
      ? formatCalendarDate(dates[0].date, { weekday: 'short', day: 'numeric', month: 'short' }, TZ)
      : '';

  const PanelCard = () => (
    <div className="rounded-[20px] border border-line bg-white p-5 text-ink shadow-[0_24px_50px_-28px_rgba(3,6,30,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[20px] font-bold tracking-[-0.02em]">
          {mode === 'date' ? 'Réserver une visite' : mode === 'soon' ? 'Vente pas encore ouverte' : mode === 'none' ? 'Prix bientôt disponible' : mode === 'sold' ? 'Complet' : mode === 'ended' ? 'Événement terminé' : 'Billets'}
        </p>
        {dateChip && mode !== 'ended' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surf px-2.5 py-1 text-[12px] font-semibold text-ink-2">
            <CalendarBlank size={14} /> {dateChip}
          </span>
        )}
      </div>

      {mode === 'date' && (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1">
            {week.map((iso) => (
              <button key={iso} type="button" onClick={() => pickDay(iso)} className={`rounded-[10px] px-1 py-2 text-center text-[12px] font-semibold ${day === iso ? 'bg-ink text-white' : 'bg-surf text-ink'}`}>
                {shortDay(iso, today)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCalendarOpen((open) => !open)} className="mt-2 text-[13px] font-semibold text-brand">Autre date</button>
          {calendarOpen && (
            <div className="mt-2">
              <VisitDateCalendar
                eventId={event.id}
                selectedDate={day}
                ticketTypes={types}
                onSelectDate={(iso, visit) => {
                  setDay(iso);
                  setDateId(visit.event_date_id || null);
                  setCalendarOpen(false);
                }}
              />
            </div>
          )}
        </div>
      )}

      {mode === 'soon' && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">L’organisateur n’a pas encore ouvert la billetterie. Les tarifs annoncés :</p>
      )}
      {mode === 'none' && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">L’organisateur n’a pas encore publié les tarifs de cet événement.</p>
      )}
      {mode === 'ended' && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">Cet événement a eu lieu le {formatCalendarDate(dates.at(-1)?.date || event.date, { day: 'numeric', month: 'long', year: 'numeric' }, TZ)}. La vente est fermée.</p>
      )}
      {mode === 'sold' && (
        <p className="mt-3 text-[14px] leading-relaxed text-ink-3">Tous les billets en vente ont été pris.</p>
      )}

      {(mode === 'open' || mode === 'date') && (
        <div className="mt-4 space-y-3">
          {(mode === 'date' ? types.filter((ticket) => paid(ticket) && ticket.sales_enabled !== false) : openTiers).map((ticket) => {
            const note = showNote(ticket.description);
            const current = qty[ticket.id] || 0;
            return (
              <div key={ticket.id} className="flex items-center justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{ticket.name}</p>
                  <p className="text-[12.5px] text-ink-3">{ticket.max_per_order || 10} billets max par commande</p>
                  {note && <p className="mt-0.5 text-[12.5px] text-ink-3">{note}</p>}
                  <p className="mt-1 text-[14px] font-semibold">{formatCurrency(Number(ticket.price), event.currency)}</p>
                </div>
                <div className="flex h-10 items-center rounded-[12px] border border-line">
                  <button type="button" aria-label="Retirer" onClick={() => change(ticket, -1)} className="grid h-10 w-9 place-items-center"><Minus size={14} /></button>
                  <span className="w-6 text-center text-[14px] font-semibold tabular-nums">{current}</span>
                  <button type="button" aria-label="Ajouter" onClick={() => change(ticket, 1)} className="grid h-10 w-9 place-items-center"><Plus size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'soon' && (
        <div className="mt-3 space-y-2">
          {types.filter(paid).map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
              <div>
                <p className="text-[15px] font-semibold">{ticket.name}</p>
                <p className="text-[12.5px] text-ink-3">Pas encore en vente</p>
              </div>
              <p className="text-[14px] font-semibold">{formatCurrency(Number(ticket.price), event.currency)}</p>
            </div>
          ))}
        </div>
      )}

      {mode === 'none' && types.some((ticket) => ticket.name) && (
        <div className="mt-3 space-y-2">
          {types.filter((ticket) => ticket.name).map((ticket) => (
            <p key={ticket.id} className="border-t border-line py-2 text-[15px] font-semibold">{ticket.name}</p>
          ))}
        </div>
      )}

      {(mode === 'open' || mode === 'date') && count > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[15px]">
          <span>{count} billet{count > 1 ? 's' : ''}</span>
          <b className="tabular-nums">{formatCurrency(total, event.currency)}</b>
        </div>
      )}

      {mode === 'open' || mode === 'date' ? (
        <button type="button" disabled={count === 0} onClick={buy} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[15px] font-semibold text-white disabled:bg-surf disabled:text-ink-3">
          {count === 0 ? 'Choisissez vos billets' : <>Acheter {count} billet{count > 1 ? 's' : ''} <ArrowRight size={16} /></>}
        </button>
      ) : mode === 'soon' || mode === 'none' ? (
        <>
          <button type="button" disabled className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-surf text-[15px] font-semibold text-ink-3">
            <Lock size={16} /> {mode === 'none' ? 'Prix bientôt disponible' : 'Vente pas encore ouverte'}
          </button>
          <button type="button" onClick={share} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-line text-[15px] font-semibold">
            <WhatsappLogo size={18} /> Partager l’événement
          </button>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">Cette page affichera les billets dès l’ouverture de la vente.</p>
        </>
      ) : (
        <a href="/events" className="mt-4 flex h-12 w-full items-center justify-center rounded-[10px] bg-ink text-[15px] font-semibold text-white">
          {mode === 'sold' ? 'Voir d’autres événements' : 'Voir les prochains événements'}
        </a>
      )}

      {mode === 'ended' && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">Vous aviez un billet ? Il reste dans « Mes billets », onglet Passés.</p>
      )}

      <p className="mt-4 text-[12px] text-ink-4">Billets › Coordonnées › Paiement › Billets reçus</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Orange Money, Moov Money ou carte. Votre billet QR arrive sur votre téléphone.</p>
    </div>
  );

  const barLabel = count > 0
    ? `${count} billet${count > 1 ? 's' : ''}`
    : mode === 'open'
      ? `${openTiers.length} tarif${openTiers.length > 1 ? 's' : ''}`
      : mode === 'date'
        ? 'Ouvert tous les jours'
        : mode === 'sold'
          ? 'Complet'
          : mode === 'ended'
            ? 'Événement terminé'
            : 'Vente pas encore ouverte';
  const barPrice = count > 0
    ? formatCurrency(total, event.currency)
    : mode === 'open' || mode === 'date'
      ? (minOpen > 0 ? `Dès ${formatCurrency(minOpen, event.currency)}` : 'Prix bientôt disponible')
      : mode === 'soon'
        ? (types.some(paid) ? `Dès ${formatCurrency(Math.min(...types.filter(paid).map((ticket) => Number(ticket.price))), event.currency)}` : 'Prix bientôt disponible')
        : 'Prix bientôt disponible';

  return (
    <>
      <PanelCard />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-ink-3">{barLabel}</p>
            <p className="truncate text-[15px] font-semibold">{barPrice}</p>
          </div>
          {mode === 'open' || mode === 'date' ? (
            count > 0 ? (
              <button type="button" onClick={buy} className="inline-flex h-11 items-center rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-white">Acheter <ArrowRight size={15} /></button>
            ) : (
              <button type="button" onClick={() => setSheet(true)} className="inline-flex h-11 items-center rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-white">
                {mode === 'date' ? 'Choisir ma date' : 'Choisir mes billets'}
              </button>
            )
          ) : mode === 'soon' || mode === 'none' ? (
            <button type="button" onClick={share} className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-line px-4 text-[14px] font-semibold"><WhatsappLogo size={16} /> Partager</button>
          ) : (
            <a href="/events" className="inline-flex h-11 items-center rounded-[10px] bg-ink px-4 text-[14px] font-semibold text-white">{mode === 'sold' ? 'Autres événements' : 'Voir l’agenda'}</a>
          )}
        </div>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[20px] bg-white p-3 pb-6">
            <PanelCard />
          </div>
        </div>
      )}
    </>
  );
}

export function heroPriceLine(event: Event, mode: Mode) {
  const types = event.ticket_types ?? [];
  const prices = types.map((ticket) => Number(ticket.price)).filter((price) => price > 0);
  if (!prices.length || mode === 'none') return 'Prix bientôt disponible';
  const line = `Dès ${formatCurrency(Math.min(...prices), event.currency || 'XOF')}`;
  if (mode === 'soon') return `${line} · vente pas encore ouverte`;
  return line;
}

export function hoursLine(dates: PanelDate[]) {
  const row = dates.find((item) => item.start_time);
  if (!row) return 'Ouvert tous les jours';
  const end = formatEventTime(row.end_time);
  const start = formatEventTime(row.start_time);
  return end ? `Tous les jours ${start} → ${end}` : `Tous les jours ${start}`;
}
