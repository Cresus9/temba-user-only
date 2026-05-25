import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import EventCard from '../EventCard';
import { supabase } from '../../lib/supabase-client';
import { Event, EventCategory } from '../../types/event';
import { CategoryService } from '../../services/categoryService';
import { sortEventsForDisplay } from '../../utils/eventGeo';
import { useEvents } from '../../context/EventContext';

interface CategoryEventsDisplayProps {
  searchQuery?: string;
  locationFilter?: string;
  dateFilter?: string;
  countryFilter?: string;
}

interface CategorySectionData {
  category: EventCategory;
  events: Event[];
  priority: number;
}

export default function CategoryEventsDisplay({
  searchQuery = '',
  locationFilter = '',
  dateFilter = '',
  countryFilter = '',
}: CategoryEventsDisplayProps) {
  const { activeCountry } = useEvents();
  // Authoritative country: explicit prop (from Events page filter bar) › global nav selection
  const effectiveCountry = countryFilter || activeCountry || '';

  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [eventsByCategory, setEventsByCategory] = useState<Map<string, Event[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, locationFilter, dateFilter, effectiveCountry]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const categoriesData = await CategoryService.fetchCategories();
      setCategories(categoriesData);

      let eventsQuery = supabase
        .from('events')
        .select(`
          *,
          ticket_types (*),
          event_category_relations (
            category_id,
            categories (*)
          )
        `)
        .eq('status', 'PUBLISHED');

      if (debouncedSearch) {
        eventsQuery = eventsQuery.or(
          `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
        );
      }
      if (locationFilter) {
        eventsQuery = eventsQuery.ilike('location', `%${locationFilter}%`);
      }
      if (dateFilter) {
        eventsQuery = eventsQuery.eq('date', dateFilter);
      }

      const { data: raw, error } = await eventsQuery.order('date', { ascending: true });

      if (error) throw error;

      // Sort: selected country → upcoming → past (country-others follow same pattern)
      const eventsData = sortEventsForDisplay(raw ?? [], effectiveCountry);

      // Group events by category
      const grouped = new Map<string, Event[]>();

      eventsData?.forEach((event: any) => {
        const eventCategories = event.event_category_relations?.map(
          (rel: any) => rel.categories
        ).filter(Boolean) || [];

        const legacyCategories = event.categories || [];
        const normalizedCategories = event.category_relations || [];

        const allCategoryNames = [
          ...eventCategories.map((cat: any) => cat?.name).filter(Boolean),
          ...normalizedCategories.map((cat: any) => cat?.name || cat).filter(Boolean),
          ...(Array.isArray(legacyCategories) ? legacyCategories : [])
        ];

        if (allCategoryNames.length === 0) {
          const others = grouped.get('Autres') || [];
          grouped.set('Autres', [...others, event]);
        } else {
          allCategoryNames.forEach((categoryName: string) => {
            const existing = grouped.get(categoryName) || [];
            if (!existing.find(e => e.id === event.id)) {
              grouped.set(categoryName, [...existing, event]);
            }
          });
        }
      });

      setEventsByCategory(grouped);
    } catch (error) {
      console.error('Error fetching events by category:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorySections = useMemo(() => {
    const sections: CategorySectionData[] = [];

    categories.forEach((category, index) => {
      const events = eventsByCategory.get(category.name) || [];
      if (events.length === 0) return;
      sections.push({ category, events, priority: index });
    });

    const autresEvents = eventsByCategory.get('Autres') || [];
    if (autresEvents.length > 0) {
      sections.push({
        category: {
          id: 'autres',
          name: 'Autres',
          description: 'Autres événements',
          color: '#6B7280',
          icon: '🎭',
        } as EventCategory,
        events: autresEvents,
        priority: 999,
      });
    }

    return sections.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.events.length - a.events.length;
    });
  }, [categories, eventsByCategory]);

  if (loading) {
    return (
      <div className="space-y-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-7 bg-line rounded w-1/3 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex-shrink-0 w-[220px] sm:w-[240px] bg-line rounded-xl2 aspect-square" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (categorySections.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-line rounded-xl2 bg-paper">
        <h3 className="text-ink mb-2">Aucun événement trouvé</h3>
        <p className="text-ink-mute">
          Essayez d'ajuster vos filtres ou termes de recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {categorySections.map((section) => (
        <CategorySection
          key={section.category.id || section.category.name}
          section={section}
        />
      ))}
    </div>
  );
}

interface CategorySectionProps {
  section: CategorySectionData;
}

function CategorySection({ section }: CategorySectionProps) {
  const { category, events } = section;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [events, checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 260;
    el.scrollBy({ left: dir === 'left' ? -cardWidth * 2 : cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-end justify-between gap-2 mb-4">
        <div>
          <p className="eyebrow mb-1.5">Catégorie</p>
          <h2 className="text-ink">{category.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Arrow buttons — only when there's overflow */}
          {(canScrollLeft || canScrollRight) && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="grid place-items-center w-8 h-8 rounded-full border border-line bg-paper text-ink-mute hover:text-ink hover:border-ink-mute transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Défiler vers la gauche"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="grid place-items-center w-8 h-8 rounded-full border border-line bg-paper text-ink-mute hover:text-ink hover:border-ink-mute transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Défiler vers la droite"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <Link
            to={`/categories/${category.id || category.name}`}
            className="text-[14px] font-semibold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
          >
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        {/* Left fade + arrow overlay */}
        {canScrollLeft && (
          <div className="hidden sm:flex absolute left-0 top-0 bottom-0 w-12 items-center justify-start z-10 pointer-events-none bg-gradient-to-r from-paper to-transparent" />
        )}
        {/* Right fade + arrow overlay */}
        {canScrollRight && (
          <div className="hidden sm:flex absolute right-0 top-0 bottom-0 w-12 items-center justify-end z-10 pointer-events-none bg-gradient-to-l from-paper to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {events.map((event) => {
            const isPast = event.date < new Date().toISOString().split('T')[0];
            return (
              <div
                key={event.id}
                className="flex-shrink-0 w-[220px] sm:w-[240px] relative"
                style={{ scrollSnapAlign: 'start' }}
              >
                {isPast && (
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-ink/75 text-paper text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm pointer-events-none">
                    Passé
                  </div>
                )}
                <div className={isPast ? 'opacity-60' : ''}>
                  <EventCard {...event} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
