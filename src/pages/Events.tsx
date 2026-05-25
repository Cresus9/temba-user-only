import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, MapPin, Tag, X, ArrowLeft, Globe } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { CategoryService } from '../services/categoryService';
import { SUPPORTED_COUNTRIES } from '../utils/eventGeo';
import { useEvents } from '../context/EventContext';
import PageSEO from '../components/SEO/PageSEO';
import CategoryEventsDisplay from '../components/events/CategoryEventsDisplay';
import FeaturedEvents from '../components/events/FeaturedEvents';
import UpcomingEvents from '../components/events/UpcomingEvents';

const initialFilters = {
  search: '',
  category: '',
  location: '',
  date: '',
  country: '',
  status: 'PUBLISHED',
};

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCountry: globalCountry, setActiveCountry } = useEvents();

  // URL param takes precedence; fall back to the global nav selection
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    search: searchParams.get('query') || '',
    location: searchParams.get('location') || '',
    category: searchParams.get('category') || '',
    date: searchParams.get('date') || '',
    country: searchParams.get('country') || globalCountry || '',
  }));
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCountryCodes, setActiveCountryCodes] = useState<string[]>([]);
  const [totalEvents, setTotalEvents] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const navigate = useNavigate();

  useEffect(() => {
    const query = searchParams.get('query') || '';
    const location = searchParams.get('location') || '';
    const category = searchParams.get('category') || '';
    const date = searchParams.get('date') || '';
    // null  → param absent → fall back to global nav selection
    // ''    → param present but empty → user explicitly cleared it
    const urlCountry = searchParams.get('country');
    const country = urlCountry !== null ? urlCountry : (globalCountry ?? '');

    setFilters(prev => ({
      ...prev,
      search: query,
      location,
      category,
      date,
      country,
    }));
  }, [searchParams, globalCountry]);

  useEffect(() => {
    fetchLocationsCategoriesAndCount();
  }, [filters.country]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchLocationsCategoriesAndCount = async () => {
    try {
      // Which countries actually have published events (drives visibility of country pill)
      const { data: allCountryData } = await supabase
        .from('events')
        .select('country_code')
        .eq('status', 'PUBLISHED');
      const usedCodes = [...new Set(allCountryData?.map(e => e.country_code ?? 'BF') || [])];
      setActiveCountryCodes(usedCodes);

      // Always count all published events regardless of country
      let locationQuery = supabase
        .from('events')
        .select('location, country_code', { count: 'exact' })
        .eq('status', 'PUBLISHED');
      const { data: eventsData, count } = await locationQuery;

      // Location dropdown: scope to active country so the list stays relevant
      const locationsSource = filters.country
        ? (eventsData ?? []).filter(e => (e.country_code ?? 'BF') === filters.country)
        : (eventsData ?? []);

      const uniqueLocations = [...new Set(locationsSource.map(e => e.location).filter(Boolean))];
      setLocations(uniqueLocations);
      setTotalEvents(count ?? eventsData?.length ?? 0);

      const categoryRecords = await CategoryService.fetchCategories();
      setCategories(categoryRecords.map(c => c.name));
    } catch (error) {
      console.error('Erreur lors du chargement des lieux et catégories:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setActiveCountry(null);
    setSearchParams({});
  };

  const removeFilter = (key: 'search' | 'date' | 'location' | 'category' | 'country') => {
    setFilters(prev => ({ ...prev, [key]: '' }));
    if (key === 'country') setActiveCountry(null);
    const next = new URLSearchParams(searchParams);
    if (key === 'search') next.delete('query');
    else next.delete(key);
    setSearchParams(next);
  };

  const hasFilters =
    !!filters.search || !!filters.date || !!filters.location || !!filters.category || !!filters.country;

  // Countries that actually have published events
  const countriesWithEvents = SUPPORTED_COUNTRIES.filter(c => activeCountryCodes.includes(c.code));
  const showCountryFilter = countriesWithEvents.length > 1;

  // Active country display meta
  const activeCountryMeta = filters.country
    ? SUPPORTED_COUNTRIES.find(c => c.code === filters.country)
    : null;

  const formatDateChip = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const breadcrumbSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
        { '@type': 'ListItem', position: 2, name: 'Événements', item: 'https://tembas.com/events' },
      ],
    }),
    []
  );

  return (
    <div>
      <PageSEO
        title={activeCountryMeta ? `Événements en ${activeCountryMeta.nameFr}` : 'Événements'}
        description="Concerts, festivals, sport, culture — explorez tous les événements Temba. Filtrez par pays, ville, date ou catégorie et achetez vos billets en quelques minutes."
        canonicalUrl="https://tembas.com/events"
        ogImage="https://tembas.com/temba-app.png"
        ogType="website"
        keywords={[
          'événements Burkina Faso',
          'événements diaspora africaine France',
          'agenda Ouagadougou',
          'billets concerts',
          'festivals Afrique de l\'Ouest',
        ]}
        structuredData={[breadcrumbSchema]}
      />

      {/* — — — Hero — — — */}
      <section className="relative bg-cream bg-grain overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-60"
        />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-6 pb-8 md:pt-8 md:pb-10">
          {/* Back link */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mute hover:text-ink transition-colors mb-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 lg:items-end">
            <div className="lg:col-span-7 max-w-2xl">
              <p className="eyebrow mb-2">
                Agenda
                {totalEvents !== null && (
                  <span className="ml-2 text-ink/70">
                    · <span className="tabular-nums" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{totalEvents}</span> événements
                  </span>
                )}
              </p>
              <h1 className="!text-[clamp(28px,4.4vw,44px)] !leading-[1.06] text-ink mb-3">
                Découvrez ce qui se passe{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">cette semaine</span>
                  <span aria-hidden className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0" />
                </span>
                .
              </h1>
              <p className="text-[14px] text-ink-mute max-w-xl leading-relaxed">
                Concerts, festivals, sport, culture — partout en Afrique de l'Ouest.
                Filtrez par ville, par date, ou laissez-vous surprendre.
              </p>
            </div>
          </div>

          {/* — — — Filter bar — — — */}
          <div className="mt-7">
            <div className="bg-paper rounded-xl2 border border-line shadow-card p-2 flex flex-col lg:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={handleSearchChange}
                  placeholder="Recherchez un artiste, un événement, un lieu…"
                  className="w-full h-11 pl-10 pr-3 bg-transparent text-[14px] text-ink placeholder:text-ink-mute focus:outline-none rounded-lg"
                />
              </div>

              <div aria-hidden className="hidden lg:block w-px bg-line my-1.5" />

              {/* Date */}
              <FilterPill icon={<Calendar className="h-4 w-4" />} active={!!filters.date}>
                <input
                  type="date"
                  value={filters.date}
                  onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-transparent text-[13px] text-ink focus:outline-none w-full"
                  aria-label="Filtrer par date"
                />
              </FilterPill>

              <div aria-hidden className="hidden lg:block w-px bg-line my-1.5" />

              {/* Country — only when events exist in multiple countries */}
              {showCountryFilter && (
                <>
                  <FilterPill icon={<Globe className="h-4 w-4" />} active={!!filters.country}>
                    <select
                      value={filters.country}
                      onChange={e => {
                        const code = e.target.value;
                        setFilters(prev => ({ ...prev, country: code, location: '' }));
                        setActiveCountry(code || null);
                      }}
                      className="bg-transparent text-[13px] text-ink focus:outline-none w-full appearance-none cursor-pointer pr-2"
                      aria-label="Filtrer par pays"
                    >
                      <option value="">Tous les pays</option>
                      {countriesWithEvents.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.nameFr}
                        </option>
                      ))}
                    </select>
                  </FilterPill>
                  <div aria-hidden className="hidden lg:block w-px bg-line my-1.5" />
                </>
              )}

              {/* Location */}
              <FilterPill icon={<MapPin className="h-4 w-4" />} active={!!filters.location}>
                <select
                  value={filters.location}
                  onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-transparent text-[13px] text-ink focus:outline-none w-full appearance-none cursor-pointer pr-2"
                  aria-label="Filtrer par lieu"
                >
                  <option value="">Tous les lieux</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </FilterPill>

              <div aria-hidden className="hidden lg:block w-px bg-line my-1.5" />

              {/* Category */}
              <FilterPill icon={<Tag className="h-4 w-4" />} active={!!filters.category}>
                <select
                  value={filters.category}
                  onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-transparent text-[13px] text-ink focus:outline-none w-full appearance-none cursor-pointer pr-2"
                  aria-label="Filtrer par catégorie"
                >
                  <option value="">Toutes catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </FilterPill>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="eyebrow !text-ink-mute">Filtres actifs</span>
                {filters.country && activeCountryMeta && (
                  <FilterChip
                    label={`${activeCountryMeta.flag} ${activeCountryMeta.nameFr}`}
                    onRemove={() => removeFilter('country')}
                  />
                )}
                {filters.search && (
                  <FilterChip label={`"${filters.search}"`} onRemove={() => removeFilter('search')} />
                )}
                {filters.date && (
                  <FilterChip label={formatDateChip(filters.date)} onRemove={() => removeFilter('date')} />
                )}
                {filters.location && (
                  <FilterChip label={filters.location} onRemove={() => removeFilter('location')} />
                )}
                {filters.category && (
                  <FilterChip label={filters.category} onRemove={() => removeFilter('category')} />
                )}
                <button
                  onClick={clearFilters}
                  className="text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* — — — Sections — — — */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-12 space-y-12">
        {/* Featured carousel */}
        <FeaturedEvents countryFilter={filters.country || globalCountry || ''} />

        {/* Category-grouped sections */}
        <CategoryEventsDisplay
          searchQuery={debouncedSearch}
          locationFilter={filters.location}
          dateFilter={filters.date}
          countryFilter={filters.country || globalCountry || ''}
        />

        {/* Upcoming list — only when no active filter */}
        {!debouncedSearch && !filters.location && !filters.date && !filters.category && (
          <UpcomingEvents limit={6} countryFilter={filters.country || globalCountry || ''} />
        )}
      </div>
    </div>
  );
}

/** Compact filter pill with icon. Becomes branded when active. */
function FilterPill({
  icon,
  active,
  children,
}: {
  icon: React.ReactNode;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2 h-11 px-3 rounded-lg cursor-pointer transition-colors lg:flex-1 lg:min-w-0 ${
        active ? 'bg-brand-50 text-brand' : 'text-ink-mute hover:bg-cream'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </label>
  );
}

/** Removable filter chip. */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-paper border border-line text-[12px] font-medium text-ink shadow-sm">
      {label}
      <button
        onClick={onRemove}
        className="grid place-items-center w-4 h-4 rounded-full text-ink-mute hover:bg-line hover:text-ink transition-colors"
        aria-label={`Retirer ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
