import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { supabase } from '../lib/supabase-client';
import { Event } from '../types/event';
import toast from 'react-hot-toast';
import { CategoryService } from '../services/categoryService';

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

  // Fetch events when filters change
  useEffect(() => {
    fetchEvents();
  }, [debouncedSearch, filters.category, filters.location, filters.date]);

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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('events')
        .select(`
          *,
          ticket_types (*)
        `)
        .eq('status', 'PUBLISHED');

      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;
      
      // Filter by category client-side if category filter is applied
      let filteredData = data || [];
      if (filters.category) {
        filteredData = filteredData.filter(event => 
          event.categories && event.categories.includes(filters.category)
        );
      }
      
      setEvents(filteredData);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      toast.error('Échec du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

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
