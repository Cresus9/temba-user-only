import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, X, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import {
  listAttractions,
  ATTRACTION_TYPE_LABELS,
  ATTRACTION_TYPE_ICONS,
} from '../../services/permanentVenueService';
import { formatCurrency } from '../../utils/formatters';
import { countryFlag, countryNameFr, SUPPORTED_COUNTRIES } from '../../utils/eventGeo';
import PageSEO from '../../components/SEO/PageSEO';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const PAGE_SIZE = 12;

const ALL_TYPES = Object.entries(ATTRACTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: ATTRACTION_TYPE_ICONS[value] ?? '📍',
}));

export default function AttractionsDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search,      setSearch]      = useState(searchParams.get('q') ?? '');
  const [typeFilter,  setTypeFilter]  = useState(searchParams.get('type') ?? '');
  const [countryFlt,  setCountryFlt]  = useState(searchParams.get('country') ?? '');
  const [items,       setItems]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAttractions({
      type:        typeFilter || undefined,
      countryCode: countryFlt  || undefined,
    });
    setItems(data);
    setPage(1);
    setLoading(false);
  }, [typeFilter, countryFlt]);

  useEffect(() => { load(); }, [load]);

  // Filter by search client-side
  const filtered = items.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.location?.toLowerCase().includes(search.toLowerCase()) ||
    a.city?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const lowestPrice = (a: any): number | null => {
    const tts = a.ticket_types ?? [];
    const active = tts.filter((t: any) => t.sales_enabled !== false && t.available > 0);
    if (!active.length) return null;
    return Math.min(...active.map((t: any) => t.price));
  };

  return (
    <>
      <PageSEO
        title="Attractions permanentes"
        description="Découvrez les parcs, zoos, musées et sites culturels disponibles toute l'année."
      />

      {/* ── Hero ── */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-50 blur-3xl opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-8 md:pt-14 md:pb-10">
          <p className="eyebrow mb-2">Toujours ouvert</p>
          <h1
            className="text-[clamp(28px,4vw,48px)] font-extrabold text-ink leading-[1.05] mb-3 tracking-tight"
            style={{ fontFamily: display }}
          >
            Attractions &amp; Lieux permanents
          </h1>
          <p className="text-[15px] text-ink/70 max-w-lg">
            Zoos, parcs, musées et sites culturels — réservez votre visite à n'importe quel moment.
          </p>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="bg-paper border-b border-line sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
            <input
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-cream text-[13px] text-ink placeholder-ink-mute focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setTypeFilter(''); updateParam('type', ''); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all border ${
                !typeFilter
                  ? 'bg-brand text-paper border-brand'
                  : 'bg-cream border-line text-ink-mute hover:text-ink hover:border-brand/30'
              }`}
            >
              Tous
            </button>
            {ALL_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  const v = typeFilter === t.value ? '' : t.value;
                  setTypeFilter(v);
                  updateParam('type', v);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all border ${
                  typeFilter === t.value
                    ? 'bg-brand text-paper border-brand'
                    : 'bg-cream border-line text-ink-mute hover:text-ink hover:border-brand/30'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Country */}
          <select
            value={countryFlt}
            onChange={e => { setCountryFlt(e.target.value); updateParam('country', e.target.value); setPage(1); }}
            className="h-9 px-2.5 rounded-lg border border-line bg-cream text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Tous les pays</option>
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>

          {filtered.length > 0 && (
            <span className="ml-auto text-[12px] text-ink-mute whitespace-nowrap" style={{ fontFamily: mono }}>
              {filtered.length} attraction{filtered.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl2 border border-line bg-cream overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-cream-deep" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-2/3 bg-cream-deep rounded" />
                    <div className="h-3 w-1/2 bg-cream-deep rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-[40px]">🔍</p>
              <p className="text-[16px] font-semibold text-ink">Aucune attraction trouvée</p>
              <p className="text-[14px] text-ink-mute">Essayez d'autres filtres.</p>
              {(search || typeFilter || countryFlt) && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter(''); setCountryFlt(''); }}
                  className="mt-2 px-4 py-2 bg-brand text-paper rounded-lg text-[13px] font-semibold"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginated.map(a => {
                const minPrice = lowestPrice(a);
                const typeIcon  = ATTRACTION_TYPE_ICONS[a.attraction_type ?? 'other'] ?? '📍';
                const typeLabel = ATTRACTION_TYPE_LABELS[a.attraction_type ?? 'other'] ?? '';
                const flag      = a.country_code ? countryFlag(a.country_code) : null;

                return (
                  <Link
                    key={a.id}
                    to={`/events/${a.id}`}
                    className="group flex flex-col rounded-xl2 border border-line bg-paper overflow-hidden shadow-card hover:shadow-brand-sm hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-cream-deep overflow-hidden">
                      {a.image_url ? (
                        <img
                          src={a.image_url}
                          alt={a.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-cream-deep">
                          <span className="text-[48px]">{typeIcon}</span>
                        </div>
                      )}
                      {/* Type badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-ink/70 backdrop-blur-sm rounded-md">
                        <span className="text-[11px]">{typeIcon}</span>
                        <span className="text-[10px] font-bold text-paper uppercase tracking-wide" style={{ fontFamily: mono }}>
                          {typeLabel}
                        </span>
                      </div>
                      {/* Always open badge */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        {a.featured && (
                          <div className="px-2 py-0.5 bg-amber-400 rounded-md">
                            <span className="text-[10px] font-bold text-ink uppercase tracking-wide" style={{ fontFamily: mono }}>
                              ★ Top
                            </span>
                          </div>
                        )}
                        <div className="px-2 py-0.5 bg-emerald-500 rounded-md">
                          <span className="text-[10px] font-bold text-paper uppercase tracking-wide" style={{ fontFamily: mono }}>
                            Ouvert
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col gap-1.5 flex-1">
                      <h3 className="text-[14px] font-bold text-ink leading-snug group-hover:text-brand transition-colors line-clamp-2">
                        {a.title}
                      </h3>

                      {(a.city || a.location) && (
                        <div className="flex items-center gap-1.5 text-[12px] text-ink-mute">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {a.city ?? a.location}
                            {flag && <span className="ml-1">{flag}</span>}
                          </span>
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="mt-auto pt-2">
                        {minPrice !== null ? (
                          <p className="text-[13px] font-bold text-brand tabular-nums" style={{ fontFamily: display }}>
                            À partir de {formatCurrency(minPrice, a.currency ?? 'XOF')}
                          </p>
                        ) : (
                          <p className="text-[12px] text-ink-mute">Prix sur demande</p>
                        )}
                      </div>
                    </div>

                    {/* CTA strip */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-center gap-1.5 h-9 bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-lg text-[12px] font-semibold text-brand transition-colors">
                        <Ticket className="w-3.5 h-3.5" />
                        Réserver une visite
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-ink hover:bg-cream disabled:opacity-30 grid place-items-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-[13px] font-bold transition-all border ${
                    page === n
                      ? 'bg-brand text-paper border-brand shadow-card'
                      : 'bg-paper border-line text-ink-mute hover:text-ink hover:bg-cream'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-ink hover:bg-cream disabled:opacity-30 grid place-items-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
