import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';
import { shortDateLabel, eventLocationLabel, sortEventsByCountryPriority } from '../../utils/eventGeo';
import { useEvents } from '../../context/EventContext';
import Image from '../common/Image';

interface FeaturedEventsProps {
  countryFilter?: string;
}

export default function FeaturedEvents({ countryFilter = '' }: FeaturedEventsProps) {
  const { activeCountry } = useEvents();
  const effectiveCountry = countryFilter || activeCountry || '';

  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedEvents();
  }, [effectiveCountry]);

  const fetchFeaturedEvents = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select(`*, ticket_types (*)`)
        .eq('status', 'PUBLISHED')
        .gte('date', today)          // ← no past events
        .order('tickets_sold', { ascending: false })
        .order('date', { ascending: true })
        .limit(12);

      if (error) throw error;

      const sorted = sortEventsByCountryPriority(data ?? [], effectiveCountry);
      setFeaturedEvents(sorted.slice(0, 4));
    } catch (error) {
      console.error('❌ [FeaturedEvents] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = () => (
    <div className="mb-5">
      <p className="eyebrow mb-1.5 inline-flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-accent" />
        En vedette
      </p>
      <h2 className="text-ink">Les événements les plus suivis</h2>
    </div>
  );

  if (loading) {
    return (
      <section>
        <SectionHeader />
        <div className="rounded-xl2 bg-cream-deep aspect-[16/9] md:aspect-[21/9] animate-pulse" />
      </section>
    );
  }

  if (featuredEvents.length === 0) {
    return (
      <section>
        <SectionHeader />
        <div className="rounded-xl2 border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-[14px] text-ink-mute">
            Aucun événement à venir en vedette pour le moment.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader />
      <FeaturedEventsCarousel events={featuredEvents} />
    </section>
  );
}

interface FeaturedEventsCarouselProps {
  events: Event[];
}

function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const idx = Math.round(container.scrollLeft / container.offsetWidth);
      setCurrentIndex(idx);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const clamped = Math.max(0, Math.min(index, events.length - 1));
    setCurrentIndex(clamped);
    scrollContainerRef.current.scrollTo({
      left: clamped * scrollContainerRef.current.offsetWidth,
      behavior: 'smooth',
    });
  };

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < events.length - 1;

  return (
    <div className="relative group/carousel">
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
      >
        {events.map(event => (
          <div key={event.id} className="flex-shrink-0 w-full snap-start">
            <FeaturedEventCard event={event} />
          </div>
        ))}
      </div>

      {/* Arrow buttons — only when >1 slide */}
      {events.length > 1 && (
        <>
          <button
            onClick={() => scrollToIndex(currentIndex - 1)}
            disabled={!canPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-10 h-10 rounded-full bg-paper/20 backdrop-blur-sm border border-paper/25 text-paper transition-all hover:bg-paper/35 disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Événement précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollToIndex(currentIndex + 1)}
            disabled={!canNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-10 h-10 rounded-full bg-paper/20 backdrop-blur-sm border border-paper/25 text-paper transition-all hover:bg-paper/35 disabled:opacity-0 disabled:pointer-events-none"
            aria-label="Événement suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {events.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-brand w-6' : 'bg-line hover:bg-ink-mute w-1.5'
              }`}
              aria-label={`Aller à l'événement ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FeaturedEventCardProps {
  event: Event;
}

function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  const tz = event.timezone ?? 'Africa/Ouagadougou';

  const longDate = new Date(`${event.date}T12:00:00Z`).toLocaleDateString('fr-FR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const { primary: locationLabel, badge: flagBadge } = eventLocationLabel({
    location: event.location,
    city: event.city,
    country_code: event.country_code,
  });

  return (
    <Link
      to={`/events/${event.id}`}
      className="group relative block rounded-xl2 overflow-hidden bg-ink shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
        <Image
          src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600'}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          width={1600}
          height={900}
          quality={88}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />

        {/* Vedette pill */}
        <div className="absolute top-4 left-4 md:top-5 md:left-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper/15 backdrop-blur-sm border border-paper/20">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/90">
            Événement en vedette
          </span>
        </div>

        {/* Country badge */}
        {flagBadge && (
          <div className="absolute top-4 right-4 md:top-5 md:right-6 text-[20px] leading-none" aria-label={event.country_code ?? ''}>
            {flagBadge}
          </div>
        )}

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 lg:p-10 max-w-3xl">
          <p
            className="text-accent text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.14em] mb-2.5"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            {longDate}
            {event.time && (
              <>
                <span className="mx-2 text-paper/40">·</span>
                <span>{event.time.slice(0, 5)}</span>
              </>
            )}
          </p>

          <h3
            className="text-paper !text-[clamp(22px,3.4vw,38px)] !leading-[1.06] font-extrabold tracking-tight mb-3 line-clamp-2"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {event.title}
          </h3>

          <div className="flex items-center gap-2 text-[13px] text-paper/75 mb-5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{locationLabel}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand text-paper rounded-lg text-[13px] font-bold hover:bg-brand-700 transition-colors group-hover:gap-2.5 duration-200">
            Réserver
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
