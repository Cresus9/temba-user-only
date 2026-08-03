import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { getPermanentSchedule } from '../../services/permanentVenueService';
import type { VisitDate } from '../../types/event';
import type { PricingOverride } from '../../services/permanentVenueService';
import type { TicketType } from '../../types/event';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

interface VisitDateCalendarProps {
  eventId: string;
  selectedDate: string | null;       // YYYY-MM-DD
  onSelectDate: (date: string, visitDate: VisitDate) => void;
  /** Optional — when provided, shows day-type price under each open date */
  pricingOverrides?: PricingOverride[];
  ticketTypes?: TicketType[];
}

type DayState = 'open' | 'closed' | 'soldout' | 'past' | 'future';

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

export default function VisitDateCalendar({
  eventId,
  selectedDate,
  onSelectDate,
  pricingOverrides = [],
  ticketTypes = [],
}: VisitDateCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [schedule,  setSchedule]  = useState<VisitDate[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fetched,   setFetched]   = useState<Set<string>>(new Set()); // "YYYY-MM" keys

  // ── Price helpers ───────────────────────────────────────────────────────

  /** Min effective price for a given day type across all ticket types. */
  const minPriceByDayType = useMemo(() => {
    if (!ticketTypes.length || !pricingOverrides.length) return null;

    const calc = (dt: 'weekday' | 'weekend' | 'holiday') => {
      let min = Infinity;
      for (const tt of ticketTypes) {
        const ov = pricingOverrides.find(o => o.ticket_type_id === tt.id && o.day_type === dt);
        const p  = ov?.price ?? tt.price;
        if (p < min) min = p;
      }
      return min === Infinity ? null : min;
    };

    const weekday = calc('weekday');
    const weekend = calc('weekend');
    const holiday = calc('holiday');

    // Only worth showing if at least two day types differ
    const prices = [weekday, weekend, holiday].filter(Boolean) as number[];
    const allSame = prices.every(p => p === prices[0]);
    if (allSame || prices.length < 2) return null;

    return { weekday, weekend, holiday };
  }, [pricingOverrides, ticketTypes]);

  /** Compact price label: 5000 → "5k", 500 → "500", 12500 → "12.5k" */
  const compactPrice = (price: number | null | undefined): string | null => {
    if (price == null) return null;
    if (price >= 1000) {
      const k = price / 1000;
      return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'k';
    }
    return String(price);
  };

  /** Derive day_type from a date, using loaded schedule data when available. */
  const getDayType = (date: Date): 'weekday' | 'weekend' | 'holiday' => {
    const iso = toISO(date);
    const vd  = scheduleMap.get(iso);
    if (vd?.day_type) return vd.day_type as 'weekday' | 'weekend' | 'holiday';
    const dow = date.getDay();
    return dow === 0 || dow === 6 ? 'weekend' : 'weekday';
  };

  // Load 3 months of schedule on first render, then lazy-load when user navigates
  const fetchMonth = async (year: number, month: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (fetched.has(key)) return;

    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    // Last day of this month
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end     = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const { dates } = await getPermanentSchedule(eventId, start, end);
    setSchedule(prev => {
      const map = new Map(prev.map(d => [d.date, d]));
      dates.forEach(d => map.set(d.date, d));
      return Array.from(map.values());
    });
    setFetched(prev => new Set([...prev, key]));
    setLoading(false);
  };

  useEffect(() => { fetchMonth(viewYear, viewMonth); }, [viewYear, viewMonth]);

  // Build a lookup map date→VisitDate for O(1) access
  const scheduleMap = useMemo(() => {
    const m = new Map<string, VisitDate>();
    schedule.forEach(d => m.set(d.date, d));
    return m;
  }, [schedule]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build grid cells for current view month
  const cells = useMemo(() => {
    const firstDay  = new Date(viewYear, viewMonth, 1).getDay();  // 0=Sun
    const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];

    for (let i = 0; i < firstDay; i++) cells.push({ date: null }); // leading blanks
    for (let d = 1; d <= daysInMon; d++) cells.push({ date: new Date(viewYear, viewMonth, d) });
    // Trailing blanks to complete last row
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [viewYear, viewMonth]);

  const getDayState = (date: Date): DayState => {
    if (date < today) return 'past';
    const key = toISO(date);
    const vd  = scheduleMap.get(key);
    if (!vd) return 'future'; // schedule not loaded yet for this day
    if (vd.capacity !== null && vd.remaining <= 0) return 'soldout';
    if (vd.status?.toLowerCase() !== 'active') return 'closed';
    return 'open';
  };

  const handleClick = (date: Date) => {
    const state = getDayState(date);
    if (state !== 'open') return;
    const key = toISO(date);
    const vd  = scheduleMap.get(key)!;
    onSelectDate(key, vd);
  };

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());
  const maxYear   = today.getFullYear();
  const maxMonth  = today.getMonth() + 2; // allow 2 months ahead without needing extra load
  const canGoNext = !(viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth + 10));

  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-cream border-b border-line">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-8 h-8 rounded-lg border border-line grid place-items-center text-ink-mute hover:text-ink hover:bg-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <p className="text-[14px] font-bold text-ink" style={{ fontFamily: display }}>
            {MONTHS_FR[viewMonth]} {viewYear}
          </p>
          {loading && <Loader className="w-3 h-3 text-brand animate-spin inline-block mt-0.5" />}
        </div>

        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="w-8 h-8 rounded-lg border border-line grid place-items-center text-ink-mute hover:text-ink hover:bg-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Day names ── */}
      <div className="grid grid-cols-7 border-b border-line">
        {DAY_NAMES.map(d => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-ink-mute"
            style={{ fontFamily: mono }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date) return <div key={i} />;

          const date  = cell.date;
          const state = getDayState(date);
          const iso   = toISO(date);
          const isSelected = iso === selectedDate;
          const vd    = scheduleMap.get(iso);
          const isToday = toISO(date) === toISO(today);

          return (
            <button
              key={i}
              type="button"
              disabled={state !== 'open'}
              onClick={() => handleClick(date)}
              className={`
                relative flex flex-col items-center justify-center rounded-xl
                aspect-square text-[13px] font-medium transition-all
                ${state === 'open' && !isSelected
                  ? 'hover:bg-brand/8 hover:text-brand cursor-pointer text-ink'
                  : ''}
                ${state === 'open' && isSelected
                  ? 'bg-brand text-paper shadow-card'
                  : ''}
                ${state === 'past'
                  ? 'text-ink-mute/40 cursor-not-allowed'
                  : ''}
                ${state === 'closed'
                  ? 'text-ink-mute/50 line-through cursor-not-allowed'
                  : ''}
                ${state === 'soldout'
                  ? 'text-red-400 cursor-not-allowed'
                  : ''}
                ${state === 'future'
                  ? 'text-ink-mute/50 cursor-not-allowed'
                  : ''}
              `}
              title={
                state === 'soldout' ? 'Complet' :
                state === 'closed'  ? 'Fermé'   :
                state === 'past'    ? 'Passé'   :
                vd ? `${vd.remaining} places restantes` : ''
              }
            >
              {/* Today ring */}
              {isToday && !isSelected && (
                <span className="absolute inset-0 rounded-xl ring-2 ring-brand/40 pointer-events-none" />
              )}
              <span className={minPriceByDayType ? 'leading-none' : ''}>{date.getDate()}</span>
              {/* Day-type price label — only when prices differ between day types */}
              {state === 'open' && minPriceByDayType && (() => {
                const dt    = getDayType(date);
                const price = minPriceByDayType[dt];
                const label = compactPrice(price);
                if (!label) return null;
                return (
                  <span
                    className={`text-[8px] font-bold leading-none tabular-nums ${
                      isSelected ? 'text-paper/80' : 'text-brand/70'
                    }`}
                    style={{ fontFamily: mono }}
                  >
                    {label}
                  </span>
                );
              })()}
              {/* Capacity dot for near-full days */}
              {state === 'open' && vd?.capacity && vd.remaining < vd.capacity * 0.15 && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />
              )}
              {state === 'soldout' && (
                <span className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-line bg-cream/50">
        {[
          { dot: 'bg-brand',    label: 'Sélectionné' },
          { dot: 'bg-amber-400',label: 'Presque complet' },
          { dot: 'bg-red-400',  label: 'Complet' },
          { dot: 'bg-line',     label: 'Fermé' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-[11px] text-ink-mute">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
