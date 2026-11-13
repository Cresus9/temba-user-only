import { Link } from 'react-router-dom';
import { CalendarDots } from '@phosphor-icons/react';
import type { Event } from '../../types/event';
import DomePattern from '../design/DomePattern';
import DisplayCard from './DisplayCard';
import EventRail from './EventRail';
import { CardSkeleton } from './FlyerFrame';
import type { QuickFilterState } from './QuickFilters';
import { SHOW_FREE_FROM_ZERO_PRICE } from '../../utils/labels';
import { calendarDayInZone } from '../../utils/formatters';
import {
  cityKey,
  cityName,
  dedupeEvents,
  isPastSpan,
  overlaps,
  spanFor,
  weekendBounds,
  ymd,
  type CategoryKind,
  type ScheduleSpan,
} from '../../utils/eventDisplay';

function matchesCity(event: Event, city: string) {
  if (!city || city === 'Toutes les villes') return true;
  return cityName(cityKey(event)) === city || (event.city || '').toLowerCase() === city.toLowerCase();
}

function matchesTime(event: Event, span: ScheduleSpan, filters: QuickFilterState, today: string) {
  if (filters.tonight) return span.dates.includes(today) || ymd(event.date) === today;
  if (filters.weekend) {
    const weekend = weekendBounds(today);
    return overlaps(span, weekend.start, weekend.end);
  }
  return true;
}

export default function HomeRails({
  events,
  loading,
  spans,
  kinds,
  filters,
}: {
  events: Event[];
  loading: boolean;
  spans: Map<string, ScheduleSpan>;
  kinds: Map<string, CategoryKind>;
  filters: QuickFilterState;
}) {
  const today = calendarDayInZone();
  const weekend = weekendBounds(today);
  const upcoming = dedupeEvents(events).filter((event) => {
    const span = spans.get(event.id) ?? spanFor(event);
    if (event.is_permanent) return true;
    return !isPastSpan(span, today);
  });

  const spanOf = (event: Event) => spans.get(event.id) ?? spanFor(event);
  const inView = (event: Event) => {
    if (filters.free && SHOW_FREE_FROM_ZERO_PRICE && event.price !== 0) return false;
    return matchesTime(event, spanOf(event), filters, today);
  };

  const cityEvents = upcoming.filter((event) => matchesCity(event, filters.city) && inView(event) && !event.is_permanent);
  const weekendEvents = cityEvents.filter((event) => overlaps(spanOf(event), weekend.start, weekend.end));
  const used = new Set(weekendEvents.map((event) => event.id));
  const concerts = cityEvents.filter((event) => kinds.get(event.id) === 'concert' && !used.has(event.id));
  const attractions = upcoming.filter((event) => event.is_permanent && matchesCity(event, filters.city));

  const elsewhere = (['bobo', 'abidjan', 'ouaga'] as const)
    .map((key) => ({
      key,
      name: cityName(key),
      events: upcoming.filter((event) => !event.is_permanent && cityKey(event) === key && inView(event)),
    }))
    .filter((panel) => panel.name !== filters.city && panel.events.length > 0)
    .slice(0, 2);

  const weekendLabel = filters.city === 'Toutes les villes' ? 'Ce week-end' : `Ce week-end à ${filters.city}`;
  const emptyTime = filters.tonight ? 'ce soir' : 'ce week-end';

  if (loading) {
    return (
      <div className="flex gap-5 overflow-hidden px-5 pt-10 md:px-16 xl:px-20">
        {Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} width={236} />)}
      </div>
    );
  }

  return (
    <>
      <EventRail
        title={weekendLabel}
        subtitle={`${weekendEvents.length} événement${weekendEvents.length > 1 ? 's' : ''}`}
        href="/events?date=weekend"
        linkLabel="Tout le week-end"
        count={weekendEvents.length}
        empty={<p className="text-[15px] text-ink-2">Rien {emptyTime} à {filters.city === 'Toutes les villes' ? 'l’affiche' : filters.city}.</p>}
      >
        {weekendEvents.map((event) => (
          <DisplayCard key={event.id} event={event} span={spanOf(event)} width={290} />
        ))}
      </EventRail>

      <EventRail
        title="Concerts à venir"
        subtitle={concerts.length ? `${concerts.length} concert${concerts.length > 1 ? 's' : ''}` : 'Les prochains concerts'}
        href="/events?category=concerts"
        count={concerts.length}
        empty={<p className="text-[15px] text-ink-2">Aucun concert ne correspond à ces filtres.</p>}
      >
        {concerts.map((event) => (
          <DisplayCard key={event.id} event={event} span={spanOf(event)} width={236} />
        ))}
      </EventRail>

      {SHOW_FREE_FROM_ZERO_PRICE && (
        <EventRail title="Gratuit" subtitle="Entrée libre, sans billet payant" href="/events?free=1" count={0}>
          {null}
        </EventRail>
      )}

      {elsewhere.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pt-12 md:px-16 xl:px-20">
          <h2 className="font-display text-[26px] font-bold tracking-[-0.025em]">Ailleurs</h2>
          <p className="mt-1 text-[14.5px] text-ink-3">Changez de ville dans les filtres. Le moment choisi reste le même.</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {elsewhere.map((panel) => (
              <div key={panel.key} className="rounded-2xl border border-line px-5 pb-2 pt-5">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="font-display text-[24px] font-bold">{panel.name}</p>
                    <p className="text-[14px] text-ink-3">{panel.events.length} événement{panel.events.length > 1 ? 's' : ''} à venir</p>
                  </div>
                  <Link to={`/events?location=${encodeURIComponent(panel.name)}`} className="text-[14.5px] font-semibold text-brand">Voir l’agenda</Link>
                </div>
                {panel.events.slice(0, 3).map((event) => (
                  <DisplayCard key={event.id} event={event} span={spanOf(event)} variant="compact" />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {attractions.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pt-12 md:px-16 xl:px-20">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-[26px] font-bold tracking-[-0.025em]">Ouvert toute l’année</h2>
              <p className="mt-1 text-[14.5px] text-ink-3">Parcs, zoos et lieux à visiter quand vous voulez.</p>
            </div>
            <Link to="/attractions" className="text-[14.5px] font-semibold text-brand">Toutes les attractions</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {attractions.slice(0, 2).map((event) => (
              <DisplayCard key={event.id} event={event} span={spanOf(event)} variant="attraction" />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1440px] px-5 pb-4 pt-12 md:px-16 xl:px-20">
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-brand px-7 py-8 text-white md:flex-row md:items-center md:px-12 md:py-10">
          <DomePattern variant="dome" className="object-right-bottom opacity-90" />
          <div className="relative">
            <p className="font-display text-[28px] font-bold leading-tight tracking-[-0.03em] md:text-[32px]">Tout l’agenda, jour par jour.</p>
            <p className="mt-2 max-w-[460px] text-[16px] text-white/80">{upcoming.filter((event) => !event.is_permanent).length} événements à venir. Filtrez par date, ville ou catégorie.</p>
          </div>
          <Link to="/events" className="relative inline-flex h-[52px] items-center gap-2 rounded-[10px] bg-white px-5 text-[16px] font-semibold text-ink">
            <CalendarDots size={20} /> Ouvrir l’agenda
          </Link>
        </div>
      </section>
    </>
  );
}
