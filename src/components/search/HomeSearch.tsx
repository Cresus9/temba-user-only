import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';
import { Input, Button } from '../ui';

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
      <div className="w-full max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-[var(--gray-200)] rounded-lg mb-4"></div>
          <div className="h-12 bg-[var(--gray-200)] rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Rechercher des événements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search className="h-5 w-5" />}
            className="bg-white/90 backdrop-blur-sm"
          />
        </div>
        <div className="md:w-48">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-[var(--gray-200)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] appearance-none bg-white/90 backdrop-blur-sm transition-colors duration-[var(--duration-fast)]"
            >
              <option value="">Tous les lieux</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="px-8 shadow-lg shadow-[var(--primary-600)]/20"
        >
          Rechercher
        </Button>
      </div>
    </form>
  );
}
