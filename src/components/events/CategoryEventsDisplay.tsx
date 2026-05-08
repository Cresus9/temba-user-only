import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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

interface CategorySectionData {
  category: EventCategory;
  events: Event[];
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

  // Create category sections
  const categorySections = useMemo(() => {
    const sections: CategorySectionData[] = [];

    categories.forEach((category, index) => {
      const events = eventsByCategory.get(category.name) || [];
      
      if (events.length === 0) return;

      sections.push({
        category,
        events,
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
      <div className="space-y-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-7 bg-line rounded w-1/3 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="bg-line rounded-xl2 aspect-square" />
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

// Individual Category Section Component
interface CategorySectionProps {
  section: CategorySectionData;
}

function CategorySection({ section }: CategorySectionProps) {
  const { category, events } = section;

  return (
    <section>
      {/* Category Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
        <div>
          <p className="eyebrow mb-1.5">Catégorie</p>
          <h2 className="text-ink">{category.name}</h2>
        </div>
        <Link
          to={`/categories/${category.id || category.name}`}
          className="self-start md:self-end text-[14px] font-semibold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          Tout voir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {events.slice(0, 10).map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>
    </section>
  );
}


