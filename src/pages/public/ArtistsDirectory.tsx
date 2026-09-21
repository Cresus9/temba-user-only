import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Music, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { countryFlag } from '../../utils/eventGeo';
import PageSEO from '../../components/SEO/PageSEO';
import { artistsDirectoryStructuredData } from '../../utils/artistSeo';

interface Artist {
  id: string;
  name: string;
  slug: string;
  genre: string | null;
  photo_url: string | null;
  country_code: string | null;
  city: string | null;
  verified: boolean;
}

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const PAGE_SIZE = 16;

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-10 pb-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-line text-ink disabled:opacity-30 hover:border-ink/40 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-xl text-[13px] font-semibold border transition-colors ${
            p === page
              ? 'bg-ink text-paper border-ink'
              : 'bg-transparent border-line text-ink hover:border-ink/40'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-line text-ink disabled:opacity-30 hover:border-ink/40 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ArtistsDirectory() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search, genreFilter]);

  const genres = Array.from(new Set(artists.map((a) => a.genre).filter(Boolean))) as string[];
  const filtered = artists.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (genreFilter && a.genre !== genreFilter) return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const directorySchema = useMemo(
    () => artistsDirectoryStructuredData(artists.filter((a) => a.slug)),
    [artists]
  );

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <PageSEO
        title="Artistes — concerts et billets Burkina Faso"
        description="Fiches officielles des artistes programmés sur Temba : concerts à Ouagadougou et en Afrique de l’Ouest, dates publiées et billets en FCFA."
        canonicalUrl="https://tembas.com/artists"
        keywords={['artistes Burkina Faso', 'concerts Ouagadougou', 'billets Temba', 'afro', 'rap', 'live']}
        structuredData={directorySchema}
      />

      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 md:py-10">
          <p className="eyebrow !text-white/40 mb-2 tracking-[0.22em]">Temba</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className="text-[clamp(32px,5vw,48px)] font-semibold tracking-[-0.045em] leading-none text-white"
              style={{ fontFamily: display, color: '#fff' }}
            >
              Artistes
            </h1>
            <p className="text-[13px] text-white/45 tabular-nums">
              {loading ? '…' : `${filtered.length} artiste${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <p className="mt-4 max-w-xl text-[14px] text-white/50 leading-relaxed">
            Chaque fiche est la référence Temba : uniquement les concerts réellement mis en vente sur la plateforme.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 md:py-10">
        <div className="flex items-end gap-4 mb-8 pb-5 border-b border-line">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un artiste…"
              className="w-full h-11 pl-7 pr-2 bg-transparent text-[15px] text-ink placeholder:text-ink-mute/70 focus:outline-none"
            />
          </div>
          {genres.length > 0 && (
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="h-11 sm:w-[200px] bg-transparent text-[13px] text-ink focus:outline-none"
            >
              <option value="">Tous les genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border border-ink/20 border-t-ink rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 border-y border-line">
            <Music className="w-6 h-6 text-ink-mute mb-3" />
            <p className="text-[18px] font-semibold text-ink" style={{ fontFamily: display }}>
              Aucun artiste trouvé
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setGenreFilter('');
              }}
              className="mt-4 text-[13px] font-semibold text-ink underline underline-offset-4"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10">
              {paged.map((artist) => {
                const place = [artist.city, artist.country_code ? countryFlag(artist.country_code) : null]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <Link key={artist.id} to={`/artists/${artist.slug}`} className="group block min-w-0">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 bg-ink">
                      {artist.photo_url ? (
                        <img
                          src={artist.photo_url}
                          alt={`${artist.name}, artiste`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span
                            className="text-[56px] font-semibold text-white/25 tracking-tight"
                            style={{ fontFamily: display }}
                          >
                            {artist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent opacity-80" />
                      {artist.verified && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-white drop-shadow" />
                      )}
                    </div>
                    <div className="mt-3">
                      <p
                        className="text-[15px] font-semibold text-ink truncate tracking-tight"
                        style={{ fontFamily: display }}
                      >
                        {artist.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-mute truncate">
                        {[artist.genre, place].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
