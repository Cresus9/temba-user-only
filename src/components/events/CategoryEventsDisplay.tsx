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
    <section className="overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {category.name}
        </h2>
        <Link
          to={`/categories/${category.id || category.name}`}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
        >
          Voir tout {category.name}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Simple Grid Layout for all */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {events.slice(0, 8).map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>
    </section>
  );
}


