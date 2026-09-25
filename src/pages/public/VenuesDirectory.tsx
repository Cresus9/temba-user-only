import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { countryFlag } from '../../utils/eventGeo';
import PageSEO from '../../components/SEO/PageSEO';
import { venuesDirectoryStructuredData } from '../../utils/venueSeo';

const VenuesGlobe = lazy(() => import('../../components/venue/VenuesGlobe'));

interface Venue {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country_code: string | null;
  capacity: number | null;
  photos: string[] | null;
  verified: boolean;
  event_count: number;
  lat?: number | string | null;
  lng?: number | string | null;
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

export default function VenuesDirectory() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('venues')
        .select('id, name, slug, city, country_code, capacity, photos, verified, event_count, lat, lng')
        .order('name');
      setVenues(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter]);

  const cities = Array.from(new Set(venues.map((v) => v.city).filter(Boolean))) as string[];
  const filtered = venues
    .filter((v) => {
      if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (cityFilter && v.city !== cityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ap = Array.isArray(a.photos) && a.photos.length > 0 ? 1 : 0;
      const bp = Array.isArray(b.photos) && b.photos.length > 0 ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.event_count || 0) - (a.event_count || 0) || a.name.localeCompare(b.name, 'fr');
    });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const directorySchema = useMemo(
    () => venuesDirectoryStructuredData(venues.filter((v) => v.slug)),
    [venues]
  );

  const firstPhoto = (v: Venue): string | null =>
    Array.isArray(v.photos) && v.photos.length > 0 ? v.photos[0] : null;

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <PageSEO
        title="Lieux — salles et sites Temba"
        description="Salles et sites partenaires Temba. Trouvez où se jouent les concerts et festivals, puis achetez vos billets en FCFA."
        canonicalUrl="https://tembas.com/venues"
        keywords={[
          'salles concert Burkina',
          'lieux Ouagadougou',
          'événements Temba',
          'billets concert Burkina',
        ]}
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
              Lieux
            </h1>
            <p className="text-[13px] text-white/45 tabular-nums">
              {loading ? '…' : `${filtered.length} lieu${filtered.length !== 1 ? 'x' : ''}`}
            </p>
          </div>
          <p className="mt-4 max-w-xl text-[14px] text-white/50 leading-relaxed">
            Salles et sites où les dates Temba se jouent vraiment — billets en FCFA, sur place ou en ligne.
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
              placeholder="Rechercher un lieu…"
              className="w-full h-11 pl-7 pr-2 bg-transparent text-[15px] text-ink placeholder:text-ink-mute/70 focus:outline-none"
            />
          </div>
          {cities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-11 sm:w-[200px] bg-transparent text-[13px] text-ink focus:outline-none"
            >
              <option value="">Toutes les villes</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
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
            <Building2 className="w-6 h-6 text-ink-mute mb-3" />
            <p className="text-[18px] font-semibold text-ink" style={{ fontFamily: display }}>
              Aucun lieu trouvé
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCityFilter('');
              }}
              className="mt-4 text-[13px] font-semibold text-ink underline underline-offset-4"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          <>
            <Suspense fallback={<div className="h-[280px] md:h-[420px] mb-8 rounded-xl2 bg-ink animate-pulse" />}>
              <VenuesGlobe venues={filtered} className="h-[280px] md:h-[420px] mb-8" />
            </Suspense>
            <div className="border-t border-line">
              {paged.map((venue) => {
                const photo = firstPhoto(venue);
                const place = [venue.city, venue.country_code ? countryFlag(venue.country_code) : null]
                  .filter(Boolean)
                  .join(' ');
                const inner = (
                  <div className="group grid grid-cols-[4.5rem_1fr_auto] gap-4 sm:gap-5 items-center py-4 hover:bg-paper/70 transition-colors -mx-2 px-2 sm:mx-0 sm:px-1">
                    <div className="relative w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden bg-paper ring-1 ring-line flex-shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center bg-cream">
                          <span
                            className="text-[22px] font-semibold text-ink/35 tracking-tight"
                            style={{ fontFamily: display }}
                          >
                            {venue.name.replace(/^[^\p{L}]+/u, '').charAt(0).toUpperCase() || 'L'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[16px] font-semibold text-ink truncate tracking-tight"
                        style={{ fontFamily: display }}
                      >
                        {venue.name}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-mute truncate">
                        {[place, venue.capacity ? `${venue.capacity.toLocaleString('fr-FR')} places` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {venue.verified && <CheckCircle className="w-3.5 h-3.5 text-ink/35" />}
                      <span className="text-[12px] font-semibold text-accent tabular-nums">
                        {venue.event_count > 0
                          ? `${venue.event_count} date${venue.event_count > 1 ? 's' : ''}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
                return venue.slug ? (
                  <Link
                    key={venue.id}
                    to={`/venues/${venue.slug}`}
                    className="block border-b border-line"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={venue.id} className="border-b border-line">
                    {inner}
                  </div>
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
