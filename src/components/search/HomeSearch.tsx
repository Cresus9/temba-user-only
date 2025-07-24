import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';

export default function HomeSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('location')
        .eq('status', 'PUBLISHED')
        .order('location');

      if (error) throw error;

      // Get unique locations
      const uniqueLocations = [...new Set(data?.map(event => event.location))];
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Erreur lors du chargement des lieux:', error);
      toast.error('Échec du chargement des lieux');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (location) params.append('location', location);
    navigate(`/events?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="flex gap-4">
            <div className="flex-1 h-14 bg-white/10 rounded-xl"></div>
            <div className="w-48 h-14 bg-white/10 rounded-xl"></div>
            <div className="w-16 h-14 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="flex gap-4">
        {/* Search Input - Takes up most of the width */}
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/80 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Rechercher des événements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-white/30 bg-white/10 backdrop-blur-md text-white placeholder-white/60 transition-all duration-200 hover:bg-white/15 shadow-lg"
          />
        </div>

        {/* Location Button - Medium width */}
        <div className="relative group w-48">
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/80 group-focus-within:text-white transition-colors pointer-events-none" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-white/30 bg-white/10 backdrop-blur-md text-white appearance-none cursor-pointer transition-all duration-200 hover:bg-white/15 shadow-lg"
          >
            <option value="" className="text-gray-900">Tous les lieux</option>
            {locations.map((loc) => (
              <option key={loc} value={loc} className="text-gray-900">{loc}</option>
            ))}
          </select>
        </div>

        {/* Search Button - Compact, icon only */}
        <button
          type="submit"
          className="w-16 h-14 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-lg flex items-center justify-center group"
          aria-label="Rechercher des événements"
        >
          <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </form>
  );
}