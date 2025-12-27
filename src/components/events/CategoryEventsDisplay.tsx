import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import EventCard from '../EventCard';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';
import { CategoryService } from '../../services/categoryService';
import { EventCategory } from '../../types/event';

interface CategoryEventsDisplayProps {
  searchQuery?: string;
  locationFilter?: string;
  dateFilter?: string;
}

type LayoutType = 'featured' | 'horizontal' | 'grid' | 'masonry';

interface CategorySection {
  category: EventCategory;
  events: Event[];
  layout: LayoutType;
  priority: number;
}

export default function CategoryEventsDisplay({
  searchQuery = '',
  locationFilter = '',
  dateFilter = ''
}: CategoryEventsDisplayProps) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [eventsByCategory, setEventsByCategory] = useState<Map<string, Event[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories and events
  useEffect(() => {
    fetchData();
  }, [debouncedSearch, locationFilter, dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all categories
      const categoriesData = await CategoryService.fetchCategories();
      setCategories(categoriesData);

      // Fetch all published events
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

      const { data: eventsData, error } = await eventsQuery.order('date', { ascending: true });

      if (error) throw error;

      // Group events by category
      const grouped = new Map<string, Event[]>();
      
      eventsData?.forEach((event: any) => {
        // Get categories from event_category_relations (from query)
        const eventCategories = event.event_category_relations?.map(
          (rel: any) => rel.categories
        ).filter(Boolean) || [];

        // Also check legacy categories field (array of category names)
        const legacyCategories = event.categories || [];

        // Also check category_relations (normalized field)
        const normalizedCategories = event.category_relations || [];

        // Combine all sources
        const allCategoryNames = [
          ...eventCategories.map((cat: any) => cat?.name).filter(Boolean),
          ...normalizedCategories.map((cat: any) => cat?.name || cat).filter(Boolean),
          ...(Array.isArray(legacyCategories) ? legacyCategories : [])
        ];

        if (allCategoryNames.length === 0) {
          // If no category, add to "Autres" category
          const others = grouped.get('Autres') || [];
          grouped.set('Autres', [...others, event]);
        } else {
          allCategoryNames.forEach((categoryName: string) => {
            const existing = grouped.get(categoryName) || [];
            // Avoid duplicates
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

  // Create category sections with different layouts
  const categorySections = useMemo(() => {
    const sections: CategorySection[] = [];

    categories.forEach((category, index) => {
      const events = eventsByCategory.get(category.name) || [];
      
      if (events.length === 0) return;

      // Determine layout based on event count and category priority
      let layout: LayoutType = 'grid';
      if (events.length >= 6) {
        // Large categories: use horizontal scroll
        layout = 'horizontal';
      } else if (events.length >= 3 && index < 2) {
        // Top 2 categories with 3+ events: featured layout
        layout = 'featured';
      } else if (events.length >= 4) {
        // Medium categories: masonry
        layout = 'masonry';
      }

      sections.push({
        category,
        events,
        layout,
        priority: index
      });
    });

    // Add "Autres" category if it exists
    const autresEvents = eventsByCategory.get('Autres') || [];
    if (autresEvents.length > 0) {
      sections.push({
        category: {
          id: 'autres',
          name: 'Autres',
          description: 'Autres événements',
          color: '#6B7280',
          icon: '🎭'
        } as EventCategory,
        events: autresEvents,
        layout: 'grid',
        priority: 999
      });
    }

    // Sort by priority (first categories first, then by event count)
    return sections.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.events.length - a.events.length;
    });
  }, [categories, eventsByCategory]);

  // Debug logging - MUST be before any conditional returns
  useEffect(() => {
    console.log('📊 Category Sections:', categorySections.length);
    console.log('📊 Events by Category:', Array.from(eventsByCategory.entries()));
    console.log('📊 Categories:', categories.length);
  }, [categorySections, eventsByCategory, categories]);

  if (loading) {
    return (
      <div className="space-y-12">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="bg-gray-200 rounded-xl aspect-[4/3]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (categorySections.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun événement trouvé
        </h3>
        <p className="text-gray-600">
          Essayez d'ajuster vos filtres ou termes de recherche
        </p>
        {loading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {categorySections.map((section, sectionIndex) => (
        <CategorySection
          key={section.category.id || section.category.name}
          section={section}
          isFirst={sectionIndex === 0}
        />
      ))}
    </div>
  );
}

// Individual Category Section Component
interface CategorySectionProps {
  section: CategorySection;
  isFirst: boolean;
}

function CategorySection({ section, isFirst }: CategorySectionProps) {
  const { category, events, layout } = section;
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const categoryColors: Record<string, string> = {
    'Concert': 'from-purple-500 to-pink-500',
    'Festival': 'from-orange-500 to-red-500',
    'Théâtre': 'from-blue-500 to-indigo-500',
    'Sport': 'from-green-500 to-emerald-500',
    'Conférence': 'from-yellow-500 to-amber-500',
    'Autres': 'from-gray-500 to-slate-500'
  };

  const gradientClass = categoryColors[category.name] || 'from-indigo-500 to-purple-500';

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative group/category">
      {/* Category Header - Ticketmaster Style */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {category.name}
        </h2>
        <Link
          to={`/categories/${category.id || category.name}`}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors group/link"
        >
          Voir tout {category.name}
          <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Layout Renderer */}
      {layout === 'featured' && (
        <FeaturedLayout events={events} category={category} />
      )}
      {layout === 'horizontal' && (
        <HorizontalLayout
          events={events}
          category={category}
          scrollContainerRef={scrollContainerRef}
          scrollLeft={scrollLeft}
          scrollRight={scrollRight}
        />
      )}
      {layout === 'masonry' && (
        <MasonryLayout events={events} category={category} />
      )}
      {layout === 'grid' && (
        <GridLayout events={events} category={category} />
      )}
    </section>
  );
}

// Featured Layout - Large hero card + smaller cards
function FeaturedLayout({ events, category }: { events: Event[]; category: EventCategory }) {
  const featuredEvent = events[0];
  const otherEvents = events.slice(1, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Featured Event - Large Card */}
      <div className="lg:col-span-2">
        <Link
          to={`/events/${featuredEvent.id}`}
          className="group block h-full bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <img
              src={featuredEvent.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea'}
              alt={featuredEvent.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(featuredEvent.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2">
                {featuredEvent.title}
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{featuredEvent.location}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Other Events - Grid */}
      <div className="grid grid-cols-1 gap-4">
        {otherEvents.map((event) => (
          <EventCard key={event.id} {...event} className="h-full" />
        ))}
      </div>
    </div>
  );
}

// Horizontal Scroll Layout - Ticketmaster Style
function HorizontalLayout({
  events,
  category,
  scrollContainerRef,
  scrollLeft,
  scrollRight
}: {
  events: Event[];
  category: EventCategory;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  scrollLeft: () => void;
  scrollRight: () => void;
}) {
  return (
    <div className="relative group/scroll">
      {/* Scroll Buttons - Visible on category hover */}
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover/category:opacity-100 hover:scale-110 border border-gray-200 hover:border-indigo-500"
        aria-label="Scroll left"
      >
        <ArrowRight className="h-5 w-5 text-gray-700 rotate-180" />
      </button>
      <button
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover/category:opacity-100 hover:scale-110 border border-gray-200 hover:border-indigo-500"
        aria-label="Scroll right"
      >
        <ArrowRight className="h-5 w-5 text-gray-700" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {events.map((event) => (
          <div 
            key={event.id} 
            className="flex-shrink-0 w-80 snap-start"
            style={{ scrollSnapAlign: 'start' }}
          >
            <EventCard {...event} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Masonry Layout
function MasonryLayout({ events, category }: { events: Event[]; category: EventCategory }) {
  // Split events into columns
  const columns: Event[][] = [[], [], []];
  events.forEach((event, index) => {
    columns[index % 3].push(event);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {columns.map((columnEvents, colIndex) => (
        <div key={colIndex} className="space-y-4">
          {columnEvents.map((event) => (
            <EventCard key={event.id} {...event} className="h-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Grid Layout
function GridLayout({ events, category }: { events: Event[]; category: EventCategory }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {events.map((event) => (
        <EventCard key={event.id} {...event} className="h-full" />
      ))}
    </div>
  );
}

