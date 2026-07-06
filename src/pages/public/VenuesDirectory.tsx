import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { countryFlag } from '../../utils/eventGeo';

interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country_code: string | null;
  capacity: number | null;
  photo_url: string | null;
  verified: boolean;
}

const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function VenuesDirectory() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('venues')
        .select('id, name, slug, city, country_code, capacity, photo_url, verified')
        .order('name');
      setVenues(data || []);
      setLoading(false);
    })();
  }, []);

  const cities = Array.from(new Set(venues.map(v => v.city).filter(Boolean))) as string[];

  const filtered = venues.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && v.city !== cityFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-cream bg-grain py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-paper border border-line rounded-2xl shadow-card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-brand grid place-items-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>Lieux</h1>
              <p className="text-[12px] text-ink-mute">{venues.length} lieu{venues.length !== 1 ? 'x' : ''} sur Temba</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un lieu…"
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-paper text-[13px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow" />
            </div>
            {cities.length > 0 && (
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-line bg-paper text-[13px] text-ink focus:outline-none focus:border-brand transition-shadow">
                <option value="">Toutes les villes</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3"><Building2 className="w-8 h-8 text-ink-mute" /><p className="text-[14px] font-bold text-ink">Aucun lieu trouvé</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(venue => (
              <Link key={venue.id} to={`/venues/${venue.slug}`}
                className="group bg-paper border border-line rounded-2xl overflow-hidden hover:border-brand/40 hover:shadow-card transition-all">
                <div className="h-40 bg-cream relative overflow-hidden">
                  {venue.photo_url
                    ? <img src={venue.photo_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full grid place-items-center bg-brand/10"><Building2 className="w-10 h-10 text-brand/40" /></div>}
                  {venue.verified && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-paper/90 backdrop-blur-sm grid place-items-center">
                      <CheckCircle className="w-4 h-4 text-brand" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[14px] font-bold text-ink truncate group-hover:text-brand transition-colors" style={{ fontFamily: display }}>{venue.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {(venue.city || venue.country_code) && (
                      <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                        <MapPin className="w-3 h-3" />{[venue.city, venue.country_code ? countryFlag(venue.country_code) : null].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {venue.capacity && <span className="flex items-center gap-1 text-[11px] text-ink-mute"><Users className="w-3 h-3" />{venue.capacity.toLocaleString('fr-FR')}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
