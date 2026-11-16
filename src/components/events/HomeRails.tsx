import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';
import DisplayCard from './DisplayCard';
import EventRail from './EventRail';
import { CardSkeleton } from './FlyerFrame';
import type { QuickFilterState } from './QuickFilters';
import { SHOW_FREE_FROM_ZERO_PRICE } from '../../utils/labels';
import { calendarDayInZone, formatCalendarDate } from '../../utils/formatters';
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
  permanent = [],
  ready = true,
  loading,
  spans,
  kinds,
  filters,
}: {
  events: Event[];
  permanent?: Event[];
  ready?: boolean;
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
  concerts.forEach((event) => used.add(event.id));
  const festivals = cityEvents.filter((event) => kinds.get(event.id) === 'festival' && !used.has(event.id)).slice(0, 3);
  const attractions = dedupeEvents(permanent).filter((event) => event.is_permanent || event.attraction_type);

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
        subtitle={`${formatCalendarDate(weekend.start, { weekday: 'short', day: 'numeric', month: 'short' })} et ${formatCalendarDate(weekend.end, { weekday: 'short', day: 'numeric', month: 'short' })} · ${weekendEvents.length} événement${weekendEvents.length > 1 ? 's' : ''}`}
        href="/events?date=weekend"
        linkLabel="Tout le week-end"
        count={weekendEvents.length}
        empty={<p className="text-[15px] text-ink-2">Rien {emptyTime} à {filters.city === 'Toutes les villes' ? 'l’affiche' : filters.city}.</p>}
      >
        {weekendEvents.map((event, index) => (
          <DisplayCard key={event.id} event={event} span={spanOf(event)} eager={index < 4} />
        ))}
      </EventRail>

      <EventRail
        title="Concerts à venir"
        subtitle={concerts.length ? `${concerts.length} concert${concerts.length > 1 ? 's' : ''}` : 'Les prochains concerts'}
        href="/events?category=concerts"
        count={ready ? concerts.length : 0}
        empty={ready ? <p className="text-[15px] text-ink-2">Aucun concert à venir{filters.city === 'Toutes les villes' ? '' : ` à ${filters.city}`}.</p> : <p className="text-[15px] text-ink-2">Chargement des concerts…</p>}
      >
        {concerts.map((event, index) => (
          <DisplayCard key={event.id} event={event} span={spanOf(event)} width={236} eager={index < 4} />
        ))}
      </EventRail>

      {SHOW_FREE_FROM_ZERO_PRICE && (
        <EventRail title="Gratuit" subtitle="Entrée libre, sans billet payant" href="/events?free=1" count={0}>
          {null}
        </EventRail>
      )}

      <section className="grid items-start gap-8 px-5 pt-12 min-[1100px]:grid-cols-[1.9fr_1fr] min-[1100px]:gap-12 min-[1280px]:px-16 min-[1440px]:px-20">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-[22px] font-bold tracking-[-0.025em] md:text-[26px]">Festivals et soirées</h2>
              <p className="mt-1 text-[14.5px] text-ink-3">Aussi à {filters.city === 'Toutes les villes' ? 'l’affiche' : filters.city}</p>
            </div>
            <Link to="/events?category=festivals" className="text-[14.5px] font-semibold text-brand">Tout voir</Link>
          </div>
          {festivals.length === 0 ? (
            <p className="text-[15px] text-ink-2">Aucun festival à montrer pour ces filtres.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-3">
              {festivals.map((event) => <DisplayCard key={event.id} event={event} span={spanOf(event)} variant="grid" />)}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.025em] md:text-[26px]">Ailleurs</h2>
          <p className="mt-1 text-[14.5px] text-ink-3">Le même agenda, dans les autres villes.</p>
          <div className="mt-4 grid gap-4">
            {elsewhere.map((panel) => (
              <div key={panel.key} className="rounded-2xl border border-line bg-white px-5 pb-2 pt-5">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="font-display text-[22px] font-bold">{panel.name}</p>
                    <p className="text-[13.5px] text-ink-3">{panel.events.length} événement{panel.events.length > 1 ? 's' : ''} à venir</p>
                  </div>
                  <Link to={`/events?location=${encodeURIComponent(panel.name)}`} className="text-[14.5px] font-semibold text-brand">Voir</Link>
                </div>
                {panel.events.slice(0, 2).map((event) => (
                  <DisplayCard key={event.id} event={event} span={spanOf(event)} variant="compact" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {attractions.length > 0 && (
        <section className="px-5 pt-12 min-[1280px]:px-16 min-[1440px]:px-20">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-[22px] font-bold tracking-[-0.025em] md:text-[26px]">Ouvert toute l’année</h2>
              <p className="mt-1 text-[14.5px] text-ink-3">Parcs et zoos à visiter le jour de votre choix.</p>
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
    </>
  );
}
