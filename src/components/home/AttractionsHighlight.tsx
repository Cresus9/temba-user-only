import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { listAttractions } from '../../services/permanentVenueService';
import { FadeUp, Stagger, StaggerItem } from '../common/Motion';
import { useEvents } from '../../context/EventContext';
import { Event } from '../../types/event';
import AttractionCard from '../attractions/AttractionCard';

export default function AttractionsHighlight() {
  const { events, loading: eventsLoading } = useEvents();
  const [fallback, setFallback] = useState<Event[] | null>(null);

  const fromCatalog = useMemo(() => {
    return events
      .filter((e) => e.is_permanent)
      .sort((a, b) => {
        if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
        return (a.title || '').localeCompare(b.title || '', 'fr');
      })
      .slice(0, 6);
  }, [events]);

  useEffect(() => {
    if (eventsLoading || fromCatalog.length > 0) {
      setFallback(null);
      return;
    }
    let cancelled = false;
    listAttractions({ limit: 6 })
      .then((data) => {
        if (!cancelled) setFallback((data as Event[]).slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setFallback([]);
      });
    return () => {
      cancelled = true;
    };
  }, [eventsLoading, fromCatalog.length]);

  const items = fromCatalog.length > 0 ? fromCatalog : (fallback ?? []);
  const loading = eventsLoading || (fromCatalog.length === 0 && fallback === null);

  if (!loading && items.length === 0) return null;

  return (
    <section className="section-normal bg-paper border-t border-line">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div className="max-w-2xl">
            <p className="eyebrow mb-2">Ouvert toute l'année</p>
            <h2 className="text-ink mb-2">Attractions &amp; Lieux permanents</h2>
            <p className="text-[14px] text-ink-mute">
              Zoos, parcs, musées — réservez votre visite à n'importe quel moment.
            </p>
          </div>
          <Link
            to="/attractions"
            className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand transition-colors"
          >
            Voir toutes les attractions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeUp>

        {loading && (
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl2 border border-line bg-cream overflow-hidden animate-pulse flex-shrink-0 w-[75vw] sm:w-[45vw] md:w-auto">
                <div className="aspect-[4/3] bg-cream-deep" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-cream-deep rounded" />
                  <div className="h-3 w-1/2 bg-cream-deep rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <Stagger className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
                              -mx-4 px-4 md:mx-0 md:px-0
                              [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
                              md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none md:flex-none">
            {items.map((attraction) => (
              <StaggerItem key={attraction.id} className="w-[78vw] flex-shrink-0 snap-start sm:w-[44vw] md:w-auto">
                <AttractionCard attraction={attraction} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
