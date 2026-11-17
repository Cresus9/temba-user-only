import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarBlank, Check, Lock, Minus, Plus, WhatsappLogo } from '@phosphor-icons/react';
import type { Event, TicketType } from '../../types/event';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';
import { formatCurrency, formatCalendarDate, calendarDayInZone, formatEventTime } from '../../utils/formatters';
import { addDays } from '../../utils/eventDisplay';
import VisitDateCalendar from '../venue/VisitDateCalendar';
import { MULTI_DATE_CART, buildLineAllocations } from '../../utils/lineAllocations';

const TZ = 'Africa/Ouagadougou';

export interface PanelDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status?: string | null;
  capacity?: number | null;
  tickets_sold?: number | null;
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


function dateIso(row: PanelDate) {
  return (row.date || '').split('T')[0];
}

function isDateSoldOut(row: PanelDate) {
  const status = (row.status || '').toLowerCase();
  if (status === 'sold_out' || status === 'cancelled') return true;
  if (row.capacity != null && Number(row.tickets_sold) >= Number(row.capacity)) return true;
  return false;
}

function isDateUnavailable(row: PanelDate, today: string) {
  return isDateSoldOut(row) || dateIso(row) < today;
}

function firstUpcomingDate(dates: PanelDate[], today: string) {
  return dates.find((row) => !isDateUnavailable(row, today)) || dates[0] || null;
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
  /** Multi-date events: chosen date ids. null = nothing touched yet (first upcoming date). */
  const [pickedIds, setPickedIds] = useState<string[] | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(today, index)), [today]);
  const multiOpen = mode === 'open' && dates.length > 1;
  const defaultDate = useMemo(() => firstUpcomingDate(dates, today), [dates, today]);
  const multiPick = multiOpen && MULTI_DATE_CART;
  const selectedIds = useMemo(() => {
    if (!multiPick) return [] as string[];
    const base = pickedIds ?? (defaultDate && !isDateUnavailable(defaultDate, today) ? [defaultDate.id] : []);
    // Keep the event's date order whatever order the chips were tapped in.
    return dates.filter((row) => base.includes(row.id) && !isDateUnavailable(row, today)).map((row) => row.id);
  }, [multiPick, pickedIds, defaultDate, dates, today]);
  const selectedDateId = multiPick
    ? (selectedIds.length === 1 ? selectedIds[0] : null)
    : dateId || (multiOpen ? defaultDate?.id ?? null : null);
  const nDates = multiPick ? selectedIds.length : 1;
  const noDate = multiOpen && (multiPick ? selectedIds.length === 0 : !selectedDateId);
  const timesDiffer = useMemo(() => {
    const times = new Set(dates.map((row) => formatEventTime(row.start_time) || ''));
    return times.size > 1;
  }, [dates]);

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
  const dateFactor = Math.max(1, nDates);
  // Fees and totals are for every chosen date (same quantities per date).
  const orderSelections = useMemo(
    () => selections.map((item) => ({ ...item, quantity: item.quantity * dateFactor })),
    [selections, dateFactor],
  );
  const { fees } = useFeeCalculation(event.id, orderSelections);
  const subtotal = orderSelections.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (fees.total_buyer_fees || 0);
  /** Tickets per date. */
  const count = selections.reduce((sum, item) => sum + item.quantity, 0);
  /** Tickets in the whole order. */
  const orderCount = count * dateFactor;
  const multiLine = multiPick && nDates > 1 && count > 0;
  // Stock is per ticket type for all dates together.
  const shortStock = multiPick && selections.some((item) => {
    const ticket = types.find((row) => row.id === item.ticket_type_id);
    return ticket ? item.quantity * dateFactor > Number(ticket.available) : false;
  });
  const openTiers = types.filter(onSale);
  const minOpen = openTiers.length ? Math.min(...openTiers.map((ticket) => Number(ticket.price))) : 0;

  const pickDay = (iso: string) => {
    setDay(iso);
    setDateId(dates.find((row) => row.date.split('T')[0] === iso)?.id ?? null);
  };

  const toggleDate = (id: string) => {
    setPickedIds(() => (selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]));
  };

  const change = (ticket: TicketType, delta: number) => {
    // max_per_order applies to each date line; stock is shared by all chosen dates.
    // Same fallback as before when `available` is missing; with several dates the
    // stock is split across them (shortStock below blocks an order that doesn't fit).
    const available = Number(ticket.available) || ticket.max_per_order || 10;
    const stockCap = multiPick && dateFactor > 1 ? Math.floor(available / dateFactor) : available;
    const cap = Math.max(1, Math.min(ticket.max_per_order || 10, stockCap));
    setQty((prev) => {
      const next = Math.min(cap, Math.max(0, (prev[ticket.id] || 0) + delta));
      return { ...prev, [ticket.id]: next };
    });
  };

  const buy = () => {
    if (count === 0) return;
    if (noDate || shortStock) return;
    if (multiPick && selectedIds.length > 1) {
      const perDate = Object.fromEntries(selections.map((item) => [item.ticket_type_id, item.quantity]));
      const lineAllocations = buildLineAllocations(perDate, selectedIds);
      navigate('/checkout', {
        state: {
          tickets: Object.fromEntries(orderSelections.map((item) => [item.ticket_type_id, item.quantity])),
          totals: { subtotal, processingFee: 0, total },
          currency: event.currency,
          eventId: event.id,
          eventDateId: null,
          eventDateIds: selectedIds,
          lineAllocations,
        },
      });
      return;
    }
    const chosen = mode === 'date'
      ? dates.find((row) => dateIso(row) === day)
      : dates.find((row) => row.id === selectedDateId) || dates[0];
    navigate('/checkout', {
      state: {
        tickets: Object.fromEntries(selections.map((item) => [item.ticket_type_id, item.quantity])),
        totals: { subtotal, processingFee: 0, total },
        currency: event.currency,
        eventId: event.id,
        eventDateId: (mode === 'date' ? dateId || chosen?.id : selectedDateId || chosen?.id) || null,
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

  const cartLine = `${count} billet${count > 1 ? 's' : ''} × ${nDates} dates = ${orderCount} billets`;

  const PanelCard = () => (
    <div className="rounded-[20px] border border-line bg-white p-5 text-ink shadow-[0_24px_50px_-28px_rgba(3,6,30,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[20px] font-bold tracking-[-0.02em]">
          {mode === 'date' ? 'Réserver une visite' : mode === 'soon' ? 'Vente pas encore ouverte' : mode === 'none' ? 'Prix bientôt disponible' : mode === 'sold' ? 'Complet' : mode === 'ended' ? 'Événement terminé' : 'Billets'}
        </p>
        {dateChip && mode !== 'ended' && !multiOpen && (
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

      {multiOpen && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink-2">{multiPick ? 'Choisissez vos dates' : 'Choisissez une date'}</p>
            {multiPick && selectedIds.length > 0 ? (
              <p className="text-[12.5px] font-semibold text-brand">{selectedIds.length} date{selectedIds.length > 1 ? 's' : ''} choisie{selectedIds.length > 1 ? 's' : ''}</p>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dates.map((row) => {
              const unavailable = isDateUnavailable(row, today);
              const selected = multiPick ? selectedIds.includes(row.id) : selectedDateId === row.id;
              const label = formatCalendarDate(row.date, { weekday: 'short', day: 'numeric', month: 'short' }, TZ);
              const time = timesDiffer ? formatEventTime(row.start_time) : '';
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={selected}
                  onClick={() => (multiPick ? toggleDate(row.id) : setDateId(row.id))}
                  className={`min-w-[7.5rem] rounded-[10px] px-2.5 py-2 text-center text-[12px] font-semibold ${
                    unavailable
                      ? 'cursor-not-allowed bg-surf text-ink-4'
                      : selected
                        ? 'bg-ink text-white'
                        : 'bg-surf text-ink'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {multiPick && selected && !unavailable ? (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white text-ink" aria-hidden>
                        <Check size={10} weight="bold" />
                      </span>
                    ) : null}
                    {label}
                  </span>
                  {time ? <span className={`mt-0.5 block text-[11px] font-medium ${selected && !unavailable ? 'text-white/80' : 'text-ink-3'}`}>{time}</span> : null}
                  {isDateSoldOut(row) ? <span className="mt-0.5 block text-[11px] font-medium">Complet</span> : dateIso(row) < today ? <span className="mt-0.5 block text-[11px] font-medium">Passé</span> : null}
                </button>
              );
            })}
          </div>
          {multiPick && selectedIds.length > 1 ? (
            <p className="mt-2 text-[12.5px] text-ink-3">Les quantités choisies s’appliquent à chaque date.</p>
          ) : null}
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
                  <p className="text-[12.5px] text-ink-3">{ticket.max_per_order || 10} billets max {multiPick && nDates > 1 ? 'par date' : 'par commande'}</p>
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
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[15px]">
          <span>{multiLine ? cartLine : `${count} billet${count > 1 ? 's' : ''}`}</span>
          <b className="shrink-0 tabular-nums">{formatCurrency(total, event.currency)}</b>
        </div>
      )}
      {shortStock && count > 0 && (
        <p className="mt-2 text-[12.5px] font-medium text-brand">Il ne reste pas assez de billets pour toutes ces dates. Retirez une date ou un billet.</p>
      )}

      {mode === 'open' || mode === 'date' ? (
        <button type="button" disabled={count === 0 || noDate || shortStock} onClick={buy} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[15px] font-semibold text-white disabled:bg-surf disabled:text-ink-3">
          {count === 0 ? 'Choisissez vos billets' : noDate ? 'Choisissez une date' : <>Acheter {orderCount} billet{orderCount > 1 ? 's' : ''} <ArrowRight size={16} /></>}
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
    ? (multiLine ? cartLine : `${count} billet${count > 1 ? 's' : ''}`)
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
            count > 0 && !noDate && !shortStock ? (
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
