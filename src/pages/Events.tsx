import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { supabase } from '../lib/supabase-client';
import { Event } from '../types/event';
import toast from 'react-hot-toast';
import { CategoryService } from '../services/categoryService';
import PageSEO from '../components/SEO/PageSEO';
import CategoryEventsDisplay from '../components/events/CategoryEventsDisplay';
import TrendingSearches from '../components/events/TrendingSearches';
import FeaturedEvents from '../components/events/FeaturedEvents';
import UpcomingEvents from '../components/events/UpcomingEvents';

const initialFilters = {
  search: '',
  category: '',
  location: '',
  date: '',
  status: 'PUBLISHED'
};

export default function Events() {
  // Removed old events state - now using CategoryEventsDisplay
  const [filters, setFilters] = useState(initialFilters);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocationsAndCategories();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Removed old fetchEvents - now handled by CategoryEventsDisplay
  const fetchLocationsAndCategories = async () => {
    try {
      // Get unique locations
      const { data: eventsData } = await supabase
        .from('events')
        .select('location')
        .eq('status', 'PUBLISHED');
      
      const uniqueLocations = [...new Set(eventsData?.map(e => e.location) || [])];
      setLocations(uniqueLocations);

      // Load available categories from centralized service
      const categoryRecords = await CategoryService.fetchCategories();
      const uniqueCategories = categoryRecords.map(category => category.name);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Erreur lors du chargement des lieux et catégories:', error);
    }
  };

  // Removed old fetchEvents function - events are now fetched by CategoryEventsDisplay

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  // Simplified structured data - will be updated when we have events from components
  const itemListStructuredData = useMemo(() => {
    return undefined; // Will be populated by CategoryEventsDisplay if needed
  }, []);

  const breadcrumbSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://tembas.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Événements',
          item: 'https://tembas.com/events',
        },
      ],
    }),
    []
  );

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (itemListStructuredData) data.push(itemListStructuredData);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, itemListStructuredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageSEO
        title="Événements au Burkina Faso"
        description="Explorez tous les concerts, festivals, spectacles et événements professionnels disponibles sur Temba. Filtrez par ville, date ou catégorie et achetez vos billets en quelques minutes."
        canonicalUrl="https://tembas.com/events"
        ogImage="https://tembas.com/temba-app.png"
        ogType="website"
        keywords={[
          'événements Burkina Faso',
          'agenda Ouagadougou',
          'billets concerts Burkina',
          'festivals Burkina Faso',
          'événements culturels FCFA',
        ]}
        structuredData={structuredData}
      />
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Retour
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Découvrir les événements</h1>
        <p className="text-gray-600">Trouvez et réservez des billets pour les meilleurs événements près de chez vous</p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Rechercher des événements..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full md:w-48 pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full md:w-48 pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tous les lieux</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full md:w-48 pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <button
            onClick={clearFilters}
            className="px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Effacer les filtres
          </button>
        </div>
      </div>

      {/* Featured Events Carousel - Mobile Style */}
      <FeaturedEvents />
      
      {/* Category-Based Sections - Display below Featured Events */}
      <CategoryEventsDisplay
        searchQuery={debouncedSearch}
        locationFilter={filters.location}
        dateFilter={filters.date}
      />
      
      {/* Upcoming Events List - Mobile Style (if no filters) */}
      {!debouncedSearch && !filters.location && !filters.date && !filters.category && (
        <UpcomingEvents limit={6} />
      )}
    </div>
  );
}
