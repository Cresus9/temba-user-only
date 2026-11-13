import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarBlank, CalendarPlus, CaretLeft, CaretRight, Rows, SquaresFour, WhatsappLogo } from '@phosphor-icons/react';
import type { Event } from '../../types/event';
import { useEventSchedule } from '../../hooks/useEventSchedule';
import { eventPublicPath } from '../../utils/eventPath';
import { eventPricePresentation } from '../../utils/labels';
import { calendarDayInZone, formatCalendarDate, formatEventTime } from '../../utils/formatters';
import {
  cityKey,
  cityName,
  dedupeEvents,
  groupAgenda,
  isPastSpan,
  placeLabel,
  spanFor,
  weekdayIndex,
  weekendBounds,
  whenLabel,
  ymd,
  type ScheduleSpan,
} from '../../utils/eventDisplay';
import DisplayCard from './DisplayCard';
import FlyerFrame, { CardSkeleton } from './FlyerFrame';
import QuickFilters, { HOME_CITIES, type QuickFilterState } from './QuickFilters';

function calendarHref(event: Event) {
  const start = ymd(event.date).replace(/-/g, '');
  if (start.length !== 8) return eventPublicPath(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${start}`,
    location: placeLabel(event),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function FeaturedHero({ events, spans }: { events: Event[]; spans: Map<string, ScheduleSpan> }) {
  const [index, setIndex] = useState(0);
  const featured = events.filter((event) => event.featured && !isPastSpan(spans.get(event.id) ?? spanFor(event)));
  const event = featured[index];
  if (!event) return null;
  const span = spans.get(event.id) ?? spanFor(event);
  const price = eventPricePresentation(event);
  const share = `https://wa.me/?text=${encodeURIComponent(`${event.title} ${window.location.origin}${eventPublicPath(event)}`)}`;
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {event.image_url ? <img src={event.image_url} alt="" className="absolute -inset-[8%] h-[116%] w-[116%] object-cover blur-[40px] brightness-[.55]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(3,6,30,0.92)] via-[rgba(3,6,30,0.72)] to-[rgba(3,6,30,0.25)]" />
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-16 md:py-12 xl:px-20">
        <div className="max-w-[640px]">
          <p className="text-[13.5px] font-semibold text-white/75"><span className="mr-2 rounded-md bg-[#F6B84A] px-2 py-1 text-ink">À la une</span>{whenLabel(event, span)}</p>
          <h1 className="mt-3 font-display text-[40px] font-bold leading-none tracking-[-0.04em] md:text-[64px]">{event.title}</h1>
          <p className="mt-4 text-[16px] text-white/85">{placeLabel(event)}</p>
          <p className="mt-4 font-display text-[22px] font-bold">{price.label}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={eventPublicPath(event)} className="inline-flex h-[52px] items-center rounded-[10px] bg-white px-5 text-[16px] font-semibold text-ink">Voir l’événement</Link>
            <a href={share} className="inline-flex h-[52px] items-center gap-2 rounded-[10px] border border-white/25 px-4 text-white"><WhatsappLogo size={18} /> Partager</a>
            <a href={calendarHref(event)} className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-[10px] border border-white/25" aria-label="Ajouter au calendrier"><CalendarPlus size={18} /></a>
          </div>
          {featured.length > 1 && (
            <div className="mt-8 flex items-center gap-3 text-[14px] text-white/70">
              <button type="button" aria-label="Précédent" onClick={() => setIndex((i) => (i - 1 + featured.length) % featured.length)}><CaretLeft /></button>
              <span>{index + 1} / {featured.length}</span>
              <span>Suivant : {featured[(index + 1) % featured.length].title}</span>
              <button type="button" aria-label="Suivant" onClick={() => setIndex((i) => (i + 1) % featured.length)}><CaretRight /></button>
            </div>
          )}
        </div>
        <div className="w-full max-w-[440px] overflow-hidden rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]">
          {event.image_url ? <img src={event.image_url} alt="" className="w-full object-contain" /> : <FlyerFrame src="" alt="" />}
        </div>
      </div>
    </section>
  );
}

function MonthCalendar({ month, activeDays, today }: { month: string; activeDays: Set<string>; today: string }) {
  const [y, m] = month.split('-').map(Number);
  const first = weekdayIndex(`${month}-01`);
  const mondayIndex = (first + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(mondayIndex).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <p className="mb-2 font-display text-[16px] font-bold capitalize">{formatCalendarDate(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
      <div className="grid grid-cols-7 text-center text-[12px] text-ink-4">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={`${d}${i}`} className="py-1">{d}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const iso = `${month}-${String(day).padStart(2, '0')}`;
          const has = activeDays.has(iso);
          return (
            <span key={iso} className={`relative grid h-9 place-items-center text-[14px] ${iso === today ? 'rounded-lg shadow-[inset_0_0_0_1.5px_#03061E]' : ''} ${has ? 'font-semibold text-ink' : 'text-ink-3'}`}>
              {day}
              {has ? <i className="absolute bottom-1 h-1 w-1 rounded-full bg-brand" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function EventsBoard({ events, loading }: { events: Event[]; loading: boolean }) {
  const [params] = useSearchParams();
  const { spans, kinds } = useEventSchedule(events);
  const today = calendarDayInZone();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<QuickFilterState>({
    city: params.get('location') || 'Toutes les villes',
    tonight: params.get('date') === 'today',
    weekend: params.get('date') === 'weekend',
    free: false,
  });
  const query = (params.get('query') || '').toLowerCase();
  const category = params.get('category') || '';

  const visible = useMemo(() => {
    const weekend = weekendBounds(today);
    return dedupeEvents(events).filter((event) => {
      const span = spans.get(event.id) ?? spanFor(event);
      if (!event.is_permanent && isPastSpan(span, today)) return false;
      if (query && !`${event.title} ${event.location} ${event.city}`.toLowerCase().includes(query)) return false;
      if (filters.city !== 'Toutes les villes' && cityName(cityKey(event)) !== filters.city && (event.city || '') !== filters.city) return false;
      if (filters.tonight && ymd(event.date) !== today && !span.dates.includes(today)) return false;
      if (filters.weekend && !span.dates.some((day) => day >= weekend.start && day <= weekend.end)) return false;
      if (category === 'concerts' && kinds.get(event.id) !== 'concert') return false;
      return true;
    });
  }, [events, spans, filters, query, category, kinds, today]);

  const groups = groupAgenda(visible, spans, today);
  const activeDays = new Set(visible.flatMap((event) => (spans.get(event.id) ?? spanFor(event)).dates));
  const counts = HOME_CITIES.filter((city) => city !== 'Toutes les villes').map((city) => ({
    city,
    n: dedupeEvents(events).filter((event) => !isPastSpan(spans.get(event.id) ?? spanFor(event), today) && (cityName(cityKey(event)) === city || event.city === city)).length,
  }));
  const month = today.slice(0, 7);

  return (
    <div className="bg-white">
      {loading ? (
        <div className="flex gap-5 px-5 py-10 md:px-16">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : (
        <FeaturedHero events={events} spans={spans} />
      )}
      <QuickFilters value={filters} onChange={setFilters} />
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-4 md:px-16 xl:px-20">
        <p className="text-[14px] text-ink-3">{visible.length} événement{visible.length > 1 ? 's' : ''}</p>
        <div className="flex rounded-[10px] bg-surf p-1">
          <button type="button" onClick={() => setView('list')} className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[13.5px] font-semibold ${view === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-3'}`}><Rows size={16} /> Liste</button>
          <button type="button" onClick={() => setView('grid')} className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[13.5px] font-semibold ${view === 'grid' ? 'bg-white text-ink shadow-sm' : 'text-ink-3'}`}><SquaresFour size={16} /> Grille</button>
        </div>
        <button type="button" className="h-9 rounded-full border border-line px-3 text-[13.5px] font-semibold md:hidden" onClick={() => setSheet(true)}>Filtres</button>
      </div>
      <div className="mx-auto flex max-w-[1440px] items-start gap-10 px-5 pb-16 md:px-16 xl:px-20">
        <div className="min-w-0 flex-1">
          {groups.length === 0 && !loading ? <p className="text-[15px] text-ink-2">Aucun événement ne correspond à ces filtres.</p> : null}
          {view === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((event) => <DisplayCard key={event.id} event={event} span={spans.get(event.id)} />)}
            </div>
          ) : groups.map((group) => (
            <section key={group.id}>
              <h2 className="mt-8 font-display text-[28px] font-bold tracking-[-0.03em]">{group.title}</h2>
              {group.days.map((day) => (
                <div key={day.date || day.label}>
                  {day.label ? <p className="pb-2 pt-4 font-display text-[18px] font-bold">{day.label}</p> : null}
                  {day.events.map((event) => {
                    const span = spans.get(event.id) ?? spanFor(event);
                    const price = eventPricePresentation(event);
                    return (
                      <Link key={event.id} to={eventPublicPath(event)} className="grid grid-cols-[64px_72px_minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-3">
                        <span className="text-[14px] font-semibold tabular-nums">{formatEventTime(event.time) || '—'}</span>
                        <FlyerFrame src={event.image_url} alt="" />
                        <span className="min-w-0">
                          <span className="block truncate font-display text-[17px] font-bold">{event.title}</span>
                          <span className="mt-0.5 block truncate text-[14px] text-ink-3">{placeLabel(event)}</span>
                        </span>
                        <span className="text-[15px] font-semibold">{price.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>
        <aside className="sticky top-24 hidden w-[300px] shrink-0 space-y-4 lg:block">
          <div className="rounded-2xl border border-line p-4">
            <MonthCalendar month={month} activeDays={activeDays} today={today} />
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-3"><i className="h-1.5 w-1.5 rounded-full bg-brand" /> Jours avec au moins un événement</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <p className="font-display text-[16px] font-bold">Par ville</p>
            {counts.map((row) => (
              <button key={row.city} type="button" onClick={() => setFilters({ ...filters, city: row.city })} className="flex w-full justify-between border-t border-line py-2.5 text-left text-[15px]">
                <span>{row.city}</span><span className="text-ink-3">{row.n}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-[100] bg-[rgba(3,6,30,0.5)]" onClick={() => setSheet(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <p className="font-display text-[20px] font-bold">Filtres</p>
            <QuickFilters value={filters} onChange={setFilters} />
            <button type="button" className="mt-4 h-12 w-full rounded-[10px] bg-brand font-semibold text-white" onClick={() => setSheet(false)}>
              Afficher {visible.length} événement{visible.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
      <p className="sr-only"><CalendarBlank /> Agenda</p>
    </div>
  );
}
