import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarBlank, Clock, FilmStrip, MapPin, Minus, Plus } from '@phosphor-icons/react';
import type { Event, TicketType } from '../../types/event';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';
import { calendarDayInZone } from '../../utils/formatters';
import {
  crossesMidnight,
  dayNumber,
  fcfa,
  isBookable,
  longDay,
  lowestPrice,
  monthShort,
  pricesVary,
  seanceDays,
  seanceExtras,
  seancePrice,
  seancesOn,
  weekdayShort,
  type Seance,
} from '../../utils/cinema';

const TZ = 'Africa/Ouagadougou';

const STATE_LABEL: Record<string, string> = {
  filling: 'Presque complet',
  sold_out: 'Complet',
  past: 'Séance passée',
};

function onSale(ticket: TicketType) {
  return ticket.sales_enabled === true && Number(ticket.price) > 0 && Number(ticket.quantity) > 0
    && Number(ticket.available) > 0 && ticket.is_paused !== true;
}

/** Film page ticket panel: date strip, séances of the day, then tickets at the séance price. */
export default function CinemaTicketPanel({
  event,
  seances,
  venueLabel,
}: {
  event: Event;
  seances: Seance[];
  venueLabel?: string;
}) {
  const navigate = useNavigate();
  const today = calendarDayInZone(TZ);
  const types = useMemo(() => event.ticket_types ?? [], [event.ticket_types]);
  const selling = types.filter(onSale);
  const salesOpen = selling.length > 0;
  const days = useMemo(() => seanceDays(seances), [seances]);
  const firstDay = useMemo(
    () => days.find((d) => seancesOn(seances, d).some(isBookable)) || days.find((d) => d >= today) || days[0] || today,
    [days, seances, today],
  );
  const [day, setDay] = useState(firstDay);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  useEffect(() => setDay(firstDay), [firstDay]);

  const daySeances = useMemo(() => seancesOn(seances, day), [seances, day]);
  const chosen = seances.find((s) => s.id === pickedId) || null;
  const varies = pricesVary(seances);
  const from = lowestPrice(seances, (salesOpen ? selling : types).map((t) => t.id));

  const selections = useMemo(
    () => Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([ticket_type_id, quantity]) => ({
        ticket_type_id,
        quantity,
        price: seancePrice(chosen, ticket_type_id, Number(types.find((t) => t.id === ticket_type_id)?.price || 0)),
      })),
    [qty, chosen, types],
  );
  const { fees } = useFeeCalculation(event.id, selections);
  const subtotal = selections.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const total = subtotal + (fees.total_buyer_fees || 0);
  const count = selections.reduce((sum, s) => sum + s.quantity, 0);

  const pickDay = (iso: string) => {
    setDay(iso);
    setPickedId(null);
    setQty({});
  };

  const pickSeance = (s: Seance) => {
    setPickedId(s.id);
    setQty({});
  };

  const change = (ticket: TicketType, delta: number) => {
    const stock = Number(ticket.available) || ticket.max_per_order || 10;
    const room = chosen?.remaining != null ? chosen.remaining : stock;
    const cap = Math.max(1, Math.min(ticket.max_per_order || 10, stock, room));
    setQty((prev) => {
      const others = Object.entries(prev).filter(([id]) => id !== ticket.id).reduce((s, [, q]) => s + q, 0);
      const limit = chosen?.remaining != null ? Math.max(0, chosen.remaining - others) : cap;
      const next = Math.min(cap, limit, Math.max(0, (prev[ticket.id] || 0) + delta));
      return { ...prev, [ticket.id]: next };
    });
  };

  const buy = () => {
    if (!chosen || count === 0) return;
    navigate('/checkout', {
      state: {
        tickets: Object.fromEntries(selections.map((s) => [s.ticket_type_id, s.quantity])),
        totals: { subtotal, processingFee: 0, total },
        currency: event.currency,
        eventId: event.id,
        eventSlug: event.slug ?? null,
        eventDateId: chosen.id,
      },
    });
  };

  return (
    <div className="rounded-[20px] border border-line bg-white p-5 text-ink shadow-[0_24px_50px_-28px_rgba(3,6,30,0.45)]" data-testid="cinema-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[20px] font-bold tracking-[-0.02em]">Séances</p>
          <p className="mt-0.5 text-[13px] text-ink-3">Choisissez un jour, puis une heure.</p>
        </div>
        {from != null ? <span className="shrink-0 rounded-full bg-surf px-2.5 py-1 font-mono text-[12px] font-semibold text-ink-2">Dès {fcfa(from)}</span> : null}
      </div>

      <div role="tablist" aria-label="Jours de projection" className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((iso) => {
          const active = iso === day;
          const list = seancesOn(seances, iso);
          const gone = list.length > 0 && !list.some(isBookable);
          return (
            <button
              key={iso}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickDay(iso)}
              className={`flex w-[62px] shrink-0 flex-col items-center rounded-[12px] border py-2 ${
                active ? 'border-brand bg-brand text-white' : gone ? 'border-line bg-surf text-ink-4' : 'border-line bg-white text-ink'
              }`}
            >
              <span className={`text-[11.5px] font-medium ${active ? 'text-white/80' : 'text-ink-3'}`}>{iso === today ? 'Auj.' : weekdayShort(iso)}</span>
              <span className="font-mono text-[19px] font-semibold leading-tight">{dayNumber(iso)}</span>
              <span className={`text-[11px] ${active ? 'text-white/80' : 'text-ink-3'}`}>{gone ? 'Complet' : monthShort(iso)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[14px] border border-line">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[15px] font-semibold first-letter:uppercase">{longDay(day)}</p>
          {venueLabel ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3"><MapPin size={13} /> {venueLabel}</p>
          ) : null}
        </div>
        <ul className="grid grid-cols-2 gap-2 p-3">
          {daySeances.map((s) => {
            const off = !isBookable(s) || !salesOpen;
            const sel = pickedId === s.id;
            const extras = seanceExtras(s);
            const sMin = lowestPrice([s], (salesOpen ? selling : types).map((t) => t.id));
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!isBookable(s)}
                  aria-pressed={sel}
                  onClick={() => pickSeance(s)}
                  className={`w-full rounded-[12px] border px-3 py-2.5 text-left ${
                    !isBookable(s)
                      ? 'cursor-not-allowed border-line bg-surf text-ink-4'
                      : sel
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-white hover:border-brand'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[20px] font-semibold leading-none">{s.start_time}</span>
                    {s.version ? <span className={`rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-semibold ${sel ? 'bg-white/15' : 'bg-surf text-ink-2'}`}>{s.version}</span> : null}
                  </span>
                  <span className={`mt-1 block text-[12px] ${sel ? 'text-white/85' : 'text-ink-3'}`}>
                    {s.end_time ? (
                      <>{s.end_is_estimate ? 'Fin prévue ' : 'Fin '}<span className="font-mono">{s.end_time}</span>{crossesMidnight(s.start_time, s.end_time) ? ' (lendemain)' : ''}</>
                    ) : 'Fin non communiquée'}
                  </span>
                  {extras && extras !== s.version ? <span className={`block text-[12px] ${sel ? 'text-white/85' : 'text-ink-3'}`}>{[s.hall, s.format].filter(Boolean).join(' · ')}</span> : null}
                  <span className={`mt-1.5 block text-[12px] font-semibold ${sel ? 'text-white' : s.state === 'filling' ? 'text-[#B7791F]' : off ? 'text-ink-4' : 'text-ink-2'}`}>
                    {STATE_LABEL[s.state] || (!salesOpen ? 'Vente pas encore ouverte' : sMin != null && varies ? `Dès ${fcfa(sMin)}` : 'Places disponibles')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {daySeances.length === 0 ? <p className="px-4 pb-4 text-[13px] text-ink-3">Aucune séance ce jour-là.</p> : null}
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Heures de Ouagadougou. Placement libre.</p>

      {chosen && salesOpen ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Votre séance</p>
          <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
            <li className="flex items-center gap-2"><CalendarBlank size={16} /> <span className="first-letter:uppercase">{longDay(chosen.date)}</span></li>
            <li className="flex items-center gap-2"><Clock size={16} /> <span className="font-mono">{chosen.start_time}{chosen.end_time ? ` – ${chosen.end_time}` : ''}</span></li>
            {seanceExtras(chosen) ? <li className="flex items-center gap-2"><FilmStrip size={16} /> {seanceExtras(chosen)}</li> : null}
          </ul>

          <p className="mt-4 text-[13px] font-semibold text-ink-2">Billets</p>
          <div className="mt-2 divide-y divide-line rounded-[12px] border border-line">
            {selling.map((ticket) => {
              const price = seancePrice(chosen, ticket.id, Number(ticket.price));
              const q = qty[ticket.id] || 0;
              return (
                <div key={ticket.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold">{ticket.name}</p>
                    <p className="font-mono text-[13px] text-ink-2">{fcfa(price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Retirer un billet ${ticket.name}`} onClick={() => change(ticket, -1)} disabled={q === 0} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40"><Minus size={14} /></button>
                    <span className="w-5 text-center font-mono text-[15px] font-semibold tabular-nums">{q}</span>
                    <button type="button" aria-label={`Ajouter un billet ${ticket.name}`} onClick={() => change(ticket, 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line"><Plus size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1 text-[14px]">
            <p className="flex justify-between"><span className="text-ink-3">Billets</span><span className="font-mono tabular-nums">{fcfa(subtotal)}</span></p>
            {fees.total_buyer_fees ? <p className="flex justify-between"><span className="text-ink-3">Frais de service</span><span className="font-mono tabular-nums">{fcfa(fees.total_buyer_fees)}</span></p> : null}
            <p className="flex justify-between pt-1 font-display text-[18px] font-bold"><span>Total</span><span className="font-mono tabular-nums">{fcfa(total)}</span></p>
          </div>
          <button
            type="button"
            onClick={buy}
            disabled={count === 0}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-brand text-[15px] font-semibold text-white disabled:opacity-50"
          >
            Continuer <ArrowRight size={16} weight="bold" />
          </button>
          <p className="mt-2 text-center text-[12px] text-ink-3">Achat possible sans compte.</p>
        </div>
      ) : (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13.5px] leading-relaxed text-ink-3">
            {salesOpen ? 'Choisissez une heure pour voir les tarifs de la séance.' : 'La billetterie n’est pas encore ouverte. Tarifs annoncés :'}
          </p>
          {!salesOpen && types.some((t) => Number(t.price) > 0) ? (
            <ul className="mt-3 space-y-1.5">
              {types.filter((t) => Number(t.price) > 0).map((t) => (
                <li key={t.id} className="flex items-center justify-between text-[14px]">
                  <span className="text-ink-2">{t.name}</span>
                  <span className="font-mono font-medium">{varies ? `Dès ${fcfa(lowestPrice(seances.map((s) => ({ ...s, state: 'open' as const })), [t.id]) ?? Number(t.price))}` : fcfa(seancePrice(seances[0], t.id, Number(t.price)))}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
