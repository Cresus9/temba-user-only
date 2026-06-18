import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Ticket } from 'lucide-react';
import { Event } from '../../types/event';
import { useEvents } from '../../context/EventContext';

interface VenueData {
  name: string;
  eventCount: number;
  nextEvent: Event | null;
}

function normalizeLocation(location: string): string {
  const parts = location.split(/[,–-]/);
  return parts[0].trim();
}

export default function PopularVenues() {
  const { events: allEvents, loading } = useEvents();
  const today = new Date().toISOString().split('T')[0];

  // Derive venues from EventContext data — zero extra Supabase calls
  const venues = useMemo(() => {
    const locationMap = new Map<string, Event[]>();
    allEvents
      .filter(e => e.date >= today)
      .forEach(event => {
        if (event.location) {
          const key = normalizeLocation(event.location);
          const existing = locationMap.get(key) || [];
          locationMap.set(key, [...existing, event]);
        }
      });

    return Array.from(locationMap.entries())
      .map(([name, evs]) => ({ name, eventCount: evs.length, nextEvent: evs[0] || null }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 6);
  }, [allEvents, today]);

  if (loading) {
    return (
      <section>
        <div className="flex items-end justify-between mb-5">
          <div className="space-y-2">
            <div className="h-3 bg-line rounded w-20 animate-pulse" />
            <div className="h-7 bg-line rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-paper border border-line rounded-xl2 h-36 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (venues.length === 0) {
    return null;
  }

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
        <div>
          <p className="eyebrow mb-1.5">Sur place</p>
          <h2 className="text-ink">Lieux populaires</h2>
        </div>
        <Link
          to="/events"
          className="self-start md:self-end text-[14px] font-semibold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          Tous les lieux
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {venues.map((venue) => (
          <VenueCard key={venue.name} venue={venue} />
        ))}
      </div>
    </section>
  );
}

interface VenueCardProps {
  venue: VenueData;
}

function VenueCard({ venue }: VenueCardProps) {
  return (
    <Link
      to={`/events?location=${encodeURIComponent(venue.name)}`}
      className="group block bg-paper rounded-xl2 border border-line overflow-hidden hover:border-ink hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Top — ink panel with map dots motif */}
      <div className="relative h-20 bg-ink overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-6 -right-4 w-20 h-20 rounded-full bg-accent/15 blur-xl"
        />
        <div className="relative h-full flex items-center justify-between px-4">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-paper/10 border border-paper/15 backdrop-blur-sm group-hover:bg-accent group-hover:border-accent transition-colors">
            <MapPin className="h-[18px] w-[18px] text-paper" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-paper/60">
            Lieu
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-[14px] font-bold text-ink line-clamp-2 leading-snug mb-2 group-hover:text-brand transition-colors" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
          {venue.name}
        </h3>

        <div className="flex items-center gap-1.5 text-ink-mute">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-[12px] font-medium">
            {venue.eventCount} événement{venue.eventCount > 1 ? 's' : ''}
          </span>
        </div>

        {venue.nextEvent && (
          <div className="mt-3 pt-3 border-t border-line">
            <div className="flex items-start gap-1.5">
              <Ticket className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-ink-mute line-clamp-1 leading-tight">
                {venue.nextEvent.title}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
