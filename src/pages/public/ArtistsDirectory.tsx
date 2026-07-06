import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Music, MapPin, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { countryFlag } from '../../utils/eventGeo';

interface Artist {
  id: string;
  name: string;
  slug: string;
  genre: string | null;
  photo_url: string | null;
  country_code: string | null;
  city: string | null;
  verified: boolean;
  upcoming_count?: number;
}

const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function ArtistsDirectory() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('artists')
        .select('id, name, slug, genre, photo_url, country_code, city, verified')
        .order('name');
      setArtists(data || []);
      setLoading(false);
    })();
  }, []);

  const genres = Array.from(new Set(artists.map(a => a.genre).filter(Boolean))) as string[];

  const filtered = artists.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (genreFilter && a.genre !== genreFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-cream bg-grain py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="bg-paper border border-line rounded-2xl shadow-card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-accent grid place-items-center flex-shrink-0">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>Artistes</h1>
              <p className="text-[12px] text-ink-mute">{artists.length} artiste{artists.length !== 1 ? 's' : ''} sur Temba</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un artiste…"
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-paper text-[13px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow" />
            </div>
            {genres.length > 0 && (
              <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-line bg-paper text-[13px] text-ink focus:outline-none focus:border-brand transition-shadow">
                <option value="">Tous les genres</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Music className="w-8 h-8 text-ink-mute" />
            <p className="text-[14px] font-bold text-ink">Aucun artiste trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(artist => (
              <Link key={artist.id} to={`/artists/${artist.slug}`}
                className="group bg-paper border border-line rounded-2xl overflow-hidden hover:border-brand/40 hover:shadow-card transition-all">
                <div className="aspect-square bg-cream relative overflow-hidden">
                  {artist.photo_url
                    ? <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full grid place-items-center bg-accent/10"><span className="text-[40px] font-extrabold text-accent" style={{ fontFamily: display }}>{artist.name.charAt(0)}</span></div>}
                  {artist.verified && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-paper/90 backdrop-blur-sm grid place-items-center">
                      <CheckCircle className="w-4 h-4 text-brand" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[13px] font-bold text-ink truncate group-hover:text-brand transition-colors" style={{ fontFamily: display }}>{artist.name}</p>
                  {artist.genre && <span className="text-[10px] font-semibold text-accent">{artist.genre}</span>}
                  {(artist.city || artist.country_code) && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-ink-mute" />
                      <span className="text-[11px] text-ink-mute truncate">
                        {[artist.city, artist.country_code ? countryFlag(artist.country_code) : null].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
