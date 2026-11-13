import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listAttractions, ATTRACTION_TYPE_LABELS } from '../../services/permanentVenueService';
import { SUPPORTED_COUNTRIES } from '../../utils/eventGeo';
import { formatCurrency } from '../../utils/formatters';
import { eventPublicPath } from '../../utils/eventPath';
import PageSEO from '../../components/SEO/PageSEO';
import { AttractionCardData } from '../../components/attractions/AttractionCard';

const PAGE_SIZE = 12;

const ALL_TYPES = Object.entries(ATTRACTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function lowestPrice(attraction: AttractionCardData): number | null {
  const active = (attraction.ticket_types ?? []).filter(
    (ticket) => ticket.sales_enabled !== false && (ticket.available ?? 1) > 0
  );
  if (!active.length) return null;
  return Math.min(...active.map((ticket) => ticket.price));
}

function placeLabel(attraction: AttractionCardData): string {
  return attraction.city || attraction.location || '';
}

const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'en', 'sur', 'chez', 'pour', 'un', 'une', 'détente', 'visite', 'journée']);

function readableTitle(title: string): string {
  const letters = [...title].filter((char) => /\p{L}/u.test(char));
  const shouting = letters.length > 3 && letters.every((char) => char === char.toLocaleUpperCase('fr') && char !== char.toLocaleLowerCase('fr'));
  if (!shouting) return title;
  let wordIndex = 0;
  return title.split(/(\s+)/).map((part) => {
    if (!/\p{L}/u.test(part)) return part;
    const word = part.toLocaleLowerCase('fr');
    const keepSmall = wordIndex > 0 && SMALL_WORDS.has(word);
    wordIndex += 1;
    if (keepSmall) return word;
    return word.charAt(0).toLocaleUpperCase('fr') + word.slice(1);
  }).join('');
}

export default function AttractionsDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? '');
  const [countryFlt, setCountryFlt] = useState(searchParams.get('country') ?? '');
  const [items, setItems] = useState<AttractionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAttractions();
    setItems(data as AttractionCardData[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((attraction) => {
    if (typeFilter && (attraction.attraction_type ?? 'other') !== typeFilter) return false;
    if (countryFlt && attraction.country_code !== countryFlt) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      attraction.title?.toLowerCase().includes(q) ||
      attraction.location?.toLowerCase().includes(q) ||
      attraction.city?.toLowerCase().includes(q)
    );
  });

  const ordered = [...filtered].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const totalPages = Math.ceil(ordered.length / PAGE_SIZE);
  const paginated = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = Boolean(search || typeFilter || countryFlt);

  const presentTypes = ALL_TYPES.filter((type) =>
    items.some((item) => (item.attraction_type ?? 'other') === type.value)
  );
  const presentCountries = SUPPORTED_COUNTRIES.filter((country) =>
    items.some((item) => item.country_code === country.code)
  );

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setCountryFlt('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const selectType = (value: string) => {
    setTypeFilter(value);
    updateParam('type', value);
    setPage(1);
  };

  const countLabel = loading
    ? '—'
    : ordered.length === 1
      ? '1 lieu'
      : `${ordered.length} lieux`;

  return (
    <>
      <PageSEO
        title="Attractions"
        description="Parcs, zoos, musées et sites culturels ouverts toute l'année. Réservez votre visite en FCFA."
      />

      <section className="min-h-[calc(100vh-72px)] bg-white text-ink">
        <div className="mx-auto max-w-[1080px] px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
          <div className="flex items-baseline justify-between gap-6">
            <h1 className="!text-[clamp(32px,3.6vw,40px)] !font-semibold !leading-none !tracking-[-0.035em] text-ink">
              Attractions
            </h1>
            <p className="shrink-0 !text-[14px] tabular-nums text-ink/55">{countLabel}</p>
          </div>
          <p className="mt-2 !text-[15px] !leading-normal text-ink/65">
            Ouverts toute l'année. Choisissez un lieu, puis le jour.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Nom ou ville"
              aria-label="Nom ou ville"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-11 w-full border border-ink/15 bg-white px-3 text-[15px] text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none sm:max-w-xs"
            />
            <div className="relative sm:w-52">
              <select
                value={countryFlt}
                aria-label="Pays"
                onChange={(e) => {
                  setCountryFlt(e.target.value);
                  updateParam('country', e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full appearance-none border border-ink/15 bg-white pl-3 pr-9 text-[15px] text-ink focus:border-ink focus:outline-none"
              >
                <option value="">Tous les pays</option>
                {presentCountries.map((country) => (
                  <option key={country.code} value={country.code}>{country.nameFr}</option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink/50">
                ▾
              </span>
            </div>
            {filtering ? (
              <button type="button" onClick={clearFilters} className="text-left text-[14px] font-medium text-brand">
                Effacer
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex gap-x-5 overflow-x-auto border-b border-ink/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TypeButton active={!typeFilter} onClick={() => selectType('')}>
              Tous
            </TypeButton>
            {presentTypes.map((type) => (
              <TypeButton
                key={type.value}
                active={typeFilter === type.value}
                onClick={() => selectType(type.value)}
              >
                {type.label}
              </TypeButton>
            ))}
          </div>

          {loading ? (
            <div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid grid-cols-1 gap-5 border-b border-ink/10 py-6 sm:grid-cols-[240px_1fr] sm:items-center">
                  <div className="aspect-[4/3] animate-pulse bg-ink/[0.05]" />
                  <div className="space-y-2">
                    <div className="h-3 w-16 animate-pulse bg-ink/[0.06]" />
                    <div className="h-7 w-2/3 animate-pulse bg-ink/[0.06]" />
                    <div className="h-4 w-24 animate-pulse bg-ink/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="border-b border-ink/10 py-14">
              <p className="!text-[18px] !font-semibold text-ink">Aucune attraction</p>
              <p className="mt-1 !text-[15px] text-ink/65">Aucun lieu ne correspond à cette recherche.</p>
              {filtering ? (
                <button type="button" onClick={clearFilters} className="mt-4 text-[15px] font-medium text-brand">
                  Effacer les filtres
                </button>
              ) : null}
            </div>
          ) : (
            <div>
              {paginated.map((attraction) => (
                <PlaceRow key={attraction.id} attraction={attraction} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-6 text-[14px]">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="font-medium text-ink disabled:text-ink/30"
              >
                Précédent
              </button>
              <p className="!text-[14px] tabular-nums text-ink/55">{page} / {totalPages}</p>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="font-medium text-ink disabled:text-ink/30"
              >
                Suivant
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`relative shrink-0 py-2.5 text-[14px] ${
        active ? 'font-medium text-brand' : 'text-ink/70 hover:text-ink'
      }`}
    >
      {children}
      {active ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" /> : null}
    </button>
  );
}

function PlaceRow({ attraction }: { attraction: AttractionCardData }) {
  const price = lowestPrice(attraction);
  const typeLabel = ATTRACTION_TYPE_LABELS[attraction.attraction_type ?? 'other'] ?? '';
  const place = placeLabel(attraction);
  const amount = price !== null ? formatCurrency(price, attraction.currency ?? 'XOF') : null;

  return (
    <Link
      to={eventPublicPath(attraction)}
      className="group grid grid-cols-1 gap-4 border-b border-ink/10 py-6 sm:grid-cols-[240px_1fr] sm:items-center sm:gap-8"
    >
      <div className="aspect-[4/3] overflow-hidden bg-ink/[0.04]">
        {attraction.image_url ? (
          <img src={attraction.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="!text-[12px] font-medium uppercase tracking-[0.14em] text-ink/50">
            {typeLabel}
            {attraction.featured ? ' · À la une' : ''}
          </p>
          <h2 className="mt-1.5 !text-[clamp(22px,2.4vw,28px)] !font-semibold !leading-[1.15] !tracking-[-0.03em] text-ink group-hover:text-brand">
            {readableTitle(attraction.title)}
          </h2>
          {place ? <p className="mt-1 !text-[15px] !leading-normal text-ink/65">{place}</p> : null}
        </div>
        <p className="shrink-0 sm:pb-0.5 sm:text-right">
          {price === null ? (
            <span className="!text-[14px] text-ink/55">Tarifs sur la fiche</span>
          ) : price <= 0 ? (
            <span className="!text-[16px] !font-semibold text-[#0B7A52]">Gratuit</span>
          ) : (
            <>
              <span className="block !text-[12px] !leading-none text-ink/50">Dès</span>
              <span className="mt-1 block !text-[18px] !font-semibold !leading-none tabular-nums text-ink">{amount}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
