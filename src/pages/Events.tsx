import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Filter, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { Event } from '../types/event';
import toast from 'react-hot-toast';
import { EventService } from '../services/eventService';

const initialFilters = {
  search: '',
  category: '',
  location: '',
  date: '',
  status: 'PUBLISHED'
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const navigate = useNavigate();
  const eventService = useMemo(() => new EventService(), []);
  const isMountedRef = useRef(true);
  const latestRequestRef = useRef(0);

  const fetchLocationsAndCategories = useCallback(async () => {
    try {
      const metadata = await eventService.fetchFilterMetadata();
      if (!isMountedRef.current) {
        return;
      }
      setLocations(metadata.locations);
      setCategories(metadata.categories);
    } catch (error) {
      console.error('Erreur lors du chargement des lieux et catégories:', error);
    }
  }, [eventService]);

  const fetchEvents = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    try {
      setLoading(true);
      const fetchedEvents = await eventService.fetchPublishedEvents({
        search: debouncedSearch,
        location: filters.location,
        date: filters.date,
        category: filters.category,
      });

      if (!isMountedRef.current || latestRequestRef.current !== requestId) {
        return;
      }

      const categoryFilter = filters.category?.trim();
      const filtered = categoryFilter
        ? fetchedEvents.filter(event => event.categories?.includes(categoryFilter))
        : fetchedEvents;

      setEvents(filtered);
    } catch (error) {
      if (!isMountedRef.current || latestRequestRef.current !== requestId) {
        return;
      }

      console.error('Erreur lors du chargement des événements:', error);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      if (online) {
        toast.error('Échec du chargement des événements');
      }
    } finally {
      if (isMountedRef.current && latestRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [eventService, debouncedSearch, filters.category, filters.date, filters.location]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchLocationsAndCategories();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLocationsAndCategories]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch events when filters change
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl aspect-[16/9] mb-4" />
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun événement trouvé
          </h3>
          <p className="text-gray-600">
            Essayez d'ajuster vos filtres ou termes de recherche
          </p>
        </div>
      )}
    </div>
  );
}