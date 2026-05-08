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
      <div className="w-full max-w-3xl">
        <div className="animate-pulse h-[68px] bg-paper border border-line rounded-2xl shadow-card" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0 bg-paper border border-line rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 p-1.5">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-ink-mute pointer-events-none" />
          <input
            type="text"
            placeholder="Concert, artiste, festival…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl bg-transparent text-[14px] text-ink placeholder-ink-mute focus:outline-none"
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-line my-2" />

        {/* Location */}
        <div className="relative sm:w-48">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-ink-mute pointer-events-none" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full h-10 pl-10 pr-8 rounded-xl bg-transparent text-[14px] text-ink appearance-none cursor-pointer focus:outline-none"
          >
            <option value="">Tous les lieux</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <svg
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-mute"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
          </svg>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="h-10 sm:ml-1.5 px-4 sm:px-5 rounded-xl bg-brand text-paper text-[13px] font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors flex items-center justify-center gap-1.5 shadow-card"
          aria-label="Rechercher des événements"
        >
          <Search className="h-4 w-4" />
          <span className="sm:inline">Rechercher</span>
        </button>
      </div>

      {/* Trending searches hint */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-mute">
        <span className="font-semibold text-ink">Populaires :</span>
        {['Afro Vibes', 'Festival', 'Ouagadougou', 'Cinéma'].map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => setQuery(term)}
            className="px-2.5 py-0.5 rounded-full border border-line bg-paper hover:border-brand hover:text-brand transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </form>
  );
}