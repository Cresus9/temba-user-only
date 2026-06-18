import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { Event } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';
import { eventLocationLabel, sortEventsByCountryPriority } from '../../utils/eventGeo';
import { useEvents } from '../../context/EventContext';
import Image from '../common/Image';

interface UpcomingEventsProps {
  limit?: number;
  category?: string;
  countryFilter?: string;
}

export default function UpcomingEvents({ limit = 6, category, countryFilter = '' }: UpcomingEventsProps) {
  const { events: allEvents, activeCountry, loading } = useEvents();
  const effectiveCountry = countryFilter || activeCountry || '';
  const today = new Date().toISOString().split('T')[0];

  // Derive upcoming events from EventContext — zero extra Supabase calls
  const events = useMemo(() => {
    let pool = allEvents.filter(e => e.date >= today);

    if (category) {
      pool = pool.filter(event => {
        const cats = event.categories || [];
        const rels = (event as any).event_category_relations?.map(
          (rel: any) => rel.categories?.name
        ).filter(Boolean) || [];
        const normalised = event.category_relations?.map((c: any) => c?.name || c).filter(Boolean) || [];
        return cats.includes(category) || rels.includes(category) || normalised.includes(category);
      });
    }

    return sortEventsByCountryPriority(pool, effectiveCountry).slice(0, limit);
  }, [allEvents, today, category, effectiveCountry, limit]);

  const sectionTitle = category ? `${category} à venir` : 'Événements à venir';

  if (loading) {
    return (
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow mb-2">Agenda</p>
            <h2 className="text-ink">{sectionTitle}</h2>
          </div>
        </div>
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse bg-paper border border-line rounded-xl2 p-3">
              <div className="w-20 h-20 bg-line rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-line rounded w-3/4" />
                <div className="h-4 bg-line rounded w-1/2" />
                <div className="h-4 bg-line rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow mb-2">Agenda</p>
            <h2 className="text-ink">{sectionTitle}</h2>
          </div>
        </div>
        <p className="text-ink-mute text-[14px]">Aucun événement à venir pour le moment.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow mb-2">Agenda</p>
          <h2 className="text-ink">{sectionTitle}</h2>
        </div>
        <Link
          to={category ? `/categories/${category}` : '/events'}
          className="self-start md:self-end text-[14px] font-semibold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          Tout voir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {events.map((event) => (
          <UpcomingEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

interface UpcomingEventCardProps {
  event: Event;
}

function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const tz = event.timezone ?? 'Africa/Ouagadougou';
  const day = new Date(`${event.date}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: tz, day: '2-digit' });
  const month = new Date(`${event.date}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: tz, month: 'short' }).replace('.', '');
  const weekday = new Date(`${event.date}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: tz, weekday: 'short' }).replace('.', '');

  const { primary: locationLabel, badge: flagBadge } = eventLocationLabel({
    location: event.location,
    city: event.city,
    country_code: event.country_code,
  });

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex items-stretch gap-4 bg-paper border border-line rounded-xl2 hover:border-ink hover:shadow-card-hover transition-all duration-200 p-3 md:p-4"
    >
      {/* Date block — calendar-style */}
      <div className="hidden sm:flex flex-col items-center justify-center w-16 flex-shrink-0 bg-cream rounded-xl border border-line py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-mute">{weekday}</span>
        <span className="text-[24px] font-bold text-ink leading-none mt-1" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>{day}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-accent mt-1">{month}</span>
      </div>

      {/* Image */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-cream-deep">
        <Image
          src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
          width={96}
          height={96}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-mute mb-1.5 sm:hidden">
          {weekday} {day} {month} · {event.time}
        </div>
        <div className="hidden sm:block text-[12px] text-ink-mute font-medium mb-1">
          {event.time}
        </div>
        <h3 className="text-[16px] font-bold text-ink mb-1 line-clamp-1 tracking-tight" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
          {event.title}
        </h3>
        <div className="flex items-center gap-1.5 text-ink-mute text-[13px]">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{locationLabel}</span>
          {flagBadge && (
            <span className="flex-shrink-0" aria-label={event.country_code ?? ''}>{flagBadge}</span>
          )}
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex flex-col items-end justify-center flex-shrink-0 gap-2 ml-auto">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-mute leading-none mb-1">À partir de</p>
          <p className="text-[15px] font-bold text-ink leading-none tracking-tight">{formatCurrency(event.price, event.currency)}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-paper rounded-xl text-[13px] font-semibold group-hover:bg-brand-700 transition-colors whitespace-nowrap shadow-card">
          Réserver
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

