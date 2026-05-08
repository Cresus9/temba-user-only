import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, X, ChevronRight, Loader2, RotateCw, Inbox } from 'lucide-react';
import CategoryList from '../components/categories/CategoryList';
import { useCategoryStore } from '../stores/categoryStore';
import { EventCategory } from '../types/event';
import PageSEO from '../components/SEO/PageSEO';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function Categories() {
  const { categories, loading, error, fetchCategories } = useCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filteredCategories, setFilteredCategories] = useState<EventCategory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = categories;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query) ||
        category.subcategories?.some(sub => sub.toLowerCase().includes(query))
      );
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(category =>
        category.subcategories?.includes(selectedSubcategory)
      );
    }

    setFilteredCategories(filtered);
  }, [categories, searchQuery, selectedSubcategory]);

  const allSubcategories = useMemo(
    () =>
      categories
        .flatMap(category => category.subcategories || [])
        .filter((sub, index, array) => array.indexOf(sub) === index)
        .sort(),
    [categories]
  );

  const hasFilters = !!(searchQuery || selectedSubcategory);
  const totalCategories = categories.length;
  const resultCount = filteredCategories.length;

  /* — — — Structured data (unchanged) — — — */
  const collectionSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catégories d’événements',
    url: 'https://tembas.com/categories',
    description:
      'Parcourez les catégories d’événements sur Temba pour trouver concerts, festivals, spectacles et activités au Burkina Faso.',
    hasPart: categories.map((category) => ({
      '@type': 'CollectionPage',
      name: category.name,
      url: `https://tembas.com/categories/${category.id}`,
      description: category.description || undefined,
    })),
  }), [categories]);

  const breadcrumbSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
      { '@type': 'ListItem', position: 2, name: 'Catégories', item: 'https://tembas.com/categories' },
    ],
  }), []);

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (collectionSchema) data.push(collectionSchema);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, collectionSchema]);

  /* ─────────────────────────────────────────────────
     LOADING
  ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[60vh] bg-cream bg-grain grid place-items-center px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-brand animate-spin mx-auto mb-3" strokeWidth={2.5} />
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-mute"
            style={{ fontFamily: monoFamily }}
          >
            Chargement des catégories
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────
     ERROR
  ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="min-h-[60vh] bg-cream bg-grain grid place-items-center px-4">
        <div className="bg-paper rounded-xl2 border border-line shadow-card max-w-md w-full p-6 text-center">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-red-50 ring-1 ring-red-200 mx-auto mb-3">
            <X className="h-5 w-5 text-red-600" strokeWidth={2.5} />
          </div>
          <h3
            className="text-[18px] font-bold text-ink mb-1.5 tracking-tight"
            style={{ fontFamily: displayFamily }}
          >
            Erreur de chargement
          </h3>
          <p className="text-[13px] text-ink-mute mb-5 leading-relaxed">{error}</p>
          <button
            onClick={fetchCategories}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-paper text-[13px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card"
          >
            <RotateCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────
     PAGE
  ───────────────────────────────────────────────── */
  return (
    <div>
      <PageSEO
        title="Catégories d’événements"
        description="Retrouvez toutes les catégories d’événements disponibles sur Temba : concerts, festivals, clubs, conférences et plus encore au Burkina Faso."
        canonicalUrl="https://tembas.com/categories"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'catégories événements Burkina Faso',
          'sorties Ouagadougou',
          'concerts par catégorie',
          'festivals Burkina',
          'agenda culturel FCFA',
        ]}
        structuredData={structuredData}
      />

      {/* — — — Hero — — — */}
      <section className="relative bg-cream bg-grain overflow-hidden border-b border-line">
        {/* Brand glow halos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-60"
        />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-6 pb-8 md:pt-8 md:pb-10">
          {/* Breadcrumb / back link */}
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 text-[12px] text-ink-mute mb-5"
          >
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 font-medium hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </button>
            <span className="text-ink-mute/40">·</span>
            <Link to="/" className="hover:text-ink transition-colors">
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3 text-ink-mute/50" />
            <span className="text-ink font-semibold">Catégories</span>
          </nav>

          <div className="max-w-2xl">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
              style={{ fontFamily: monoFamily }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
              Catalogue
              {totalCategories > 0 && (
                <span className="ml-2 text-ink/70">
                  ·{' '}
                  <span className="tabular-nums" style={{ fontFamily: monoFamily }}>
                    {totalCategories}
                  </span>{' '}
                  catégorie{totalCategories !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <h1
              className="text-[clamp(28px,4.4vw,44px)] leading-[1.06] text-ink mb-3 font-bold tracking-tight"
              style={{ fontFamily: displayFamily }}
            >
              Trouvez l'expérience qui vous{' '}
              <span className="relative inline-block">
                <span className="relative z-10">ressemble</span>
                <span
                  aria-hidden
                  className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0"
                />
              </span>
              .
            </h1>
            <p className="text-[14px] text-ink-mute max-w-xl leading-relaxed">
              Concerts, cinéma, sport, festivals, conférences. Parcourez les catégories
              et plongez directement dans l'agenda qui vous parle.
            </p>
          </div>

          {/* — — — Filter bar — — — */}
          <div className="mt-7">
            <div className="bg-paper rounded-xl2 border border-line shadow-card p-2 flex flex-col lg:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une catégorie ou une sous-catégorie…"
                  className="w-full h-11 pl-10 pr-3 bg-transparent text-[14px] text-ink placeholder:text-ink-mute focus:outline-none rounded-lg"
                />
              </div>

              {/* Vertical divider */}
              <div aria-hidden className="hidden lg:block w-px bg-line my-1.5" />

              {/* Subcategory filter */}
              <label
                className={`flex items-center gap-2 h-11 px-3 rounded-lg cursor-pointer transition-colors lg:flex-1 lg:min-w-0 ${
                  selectedSubcategory ? 'bg-brand-50 text-brand' : 'text-ink-mute hover:bg-cream'
                }`}
              >
                <Filter className="h-4 w-4 flex-shrink-0" />
                <select
                  value={selectedSubcategory || ''}
                  onChange={(e) => setSelectedSubcategory(e.target.value || null)}
                  className="flex-1 bg-transparent text-[13px] text-ink focus:outline-none appearance-none cursor-pointer pr-2 truncate"
                  aria-label="Filtrer par sous-catégorie"
                >
                  <option value="">Toutes les sous-catégories</option>
                  {allSubcategories.map(subcategory => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Filtres actifs
                </span>
                {searchQuery && (
                  <FilterChip label={`"${searchQuery}"`} onRemove={() => setSearchQuery('')} />
                )}
                {selectedSubcategory && (
                  <FilterChip
                    label={selectedSubcategory}
                    onRemove={() => setSelectedSubcategory(null)}
                  />
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubcategory(null);
                  }}
                  className="ml-1 text-[12px] font-semibold text-brand hover:text-brand-700 transition-colors"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* — — — Content — — — */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-12">
        {/* Results header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute"
            style={{ fontFamily: monoFamily }}
          >
            <span className="tabular-nums text-ink">{resultCount}</span> résultat
            {resultCount !== 1 ? 's' : ''}
            {hasFilters && (
              <span className="ml-1.5 text-ink-mute/70">
                / sur {totalCategories}
              </span>
            )}
          </p>
        </div>

        {resultCount > 0 ? (
          <CategoryList />
        ) : (
          <EmptyState
            onClear={() => {
              setSearchQuery('');
              setSelectedSubcategory(null);
            }}
            hasFilters={hasFilters}
          />
        )}
      </div>
    </div>
  );
}

/** Removable filter chip — matches Events page pattern */
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

/** Empty state — branded, helpful */
function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="bg-paper rounded-xl2 border border-line p-10 md:p-14 text-center">
      <div className="grid place-items-center w-14 h-14 rounded-full bg-cream ring-1 ring-line mx-auto mb-4">
        <Inbox className="h-6 w-6 text-ink-mute" />
      </div>
      <h3
        className="text-[18px] font-bold text-ink tracking-tight mb-1.5"
        style={{ fontFamily: displayFamily }}
      >
        Aucune catégorie trouvée
      </h3>
      <p className="text-[13px] text-ink-mute max-w-sm mx-auto leading-relaxed mb-5">
        {hasFilters
          ? 'Essayez d\'ajuster vos termes de recherche ou retirez un filtre.'
          : 'Le catalogue est temporairement vide. Revenez dans un instant.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-paper text-[13px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card"
        >
          <X className="h-4 w-4" />
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
