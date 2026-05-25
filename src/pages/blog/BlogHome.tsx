import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Calendar, Inbox, X } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import BlogHero from '../../components/blog/BlogHero';
import BlogPostCard from '../../components/blog/BlogPostCard';
import BlogPagination from '../../components/blog/BlogPagination';
import toast from 'react-hot-toast';
import PageSEO from '../../components/SEO/PageSEO';

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

type SortKey = 'latest' | 'popular' | 'trending';

const sortOptions: { key: SortKey; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'latest', label: 'Récents', icon: Calendar },
  { key: 'popular', label: 'Populaires', icon: TrendingUp },
  { key: 'trending', label: 'Tendances', icon: Clock },
];

export default function BlogHome() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 9;

  useEffect(() => {
    loadPosts();
    loadFeaturedPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, currentPage, searchQuery]);

  const loadFeaturedPost = async () => {
    try {
      const featured = await blogService.getFeaturedPosts(1);
      if (featured.length > 0) {
        setFeaturedPost(featured[0]);
      }
    } catch (error: any) {
      console.error('Error loading featured post:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);

      let postsData;
      if (searchQuery) {
        const searchResults = await blogService.searchPosts(
          searchQuery,
          currentPage,
          postsPerPage
        );
        postsData = searchResults;
      } else {
        switch (sortBy) {
          case 'trending':
            postsData = await blogService.getTrendingPosts(currentPage, postsPerPage);
            break;
          case 'popular':
            postsData = await blogService.getPosts(
              currentPage,
              postsPerPage,
              undefined,
              'popular'
            );
            break;
          default:
            postsData = await blogService.getPosts(
              currentPage,
              postsPerPage,
              undefined,
              'newest'
            );
        }
      }

      setPosts(postsData.posts || []);
      setTotalPages(postsData.totalPages || 1);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const clearAll = () => {
    clearSearch();
    setSortBy('latest');
  };

  return (
    <div className="min-h-screen bg-paper">
      <PageSEO
        title="Blog Temba – Conseils, actualités et tendances événementielles"
        description="Le blog de Temba : conseils pour organisateurs, actualités des concerts et festivals au Burkina Faso, tendances de la billetterie en Afrique de l'Ouest."
        canonicalUrl="https://tembas.com/blog"
        keywords={[
          'blog billetterie Burkina Faso',
          'actualités concerts Burkina',
          'conseils organisateurs événements',
          'festivals Ouagadougou',
          'Temba blog',
        ]}
      />
      {/* Featured post hero */}
      {featuredPost && <BlogHero post={featuredPost} />}

      {/* If no featured, show a slim title band so the page still has a frame */}
      {!featuredPost && (
        <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 blur-3xl opacity-70"
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
              style={{ fontFamily: monoFamily }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
              Le Journal Temba
            </p>
            <h1
              className="text-[clamp(28px,4.4vw,44px)] leading-[1.06] text-ink font-bold tracking-tight"
              style={{ fontFamily: displayFamily }}
            >
              Histoires, coulisses & guides{' '}
              <span className="relative inline-block">
                <span className="relative z-10">de la scène</span>
                <span
                  aria-hidden
                  className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/40 rounded-sm -z-0"
                />
              </span>
              .
            </h1>
          </div>
        </section>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* — Toolbar: search + sort — */}
        <div className="mb-8 md:mb-10">
          <div className="bg-paper rounded-xl2 border border-line shadow-card p-2 flex flex-col md:flex-row md:items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un article…"
                className="w-full h-11 pl-10 pr-10 bg-transparent text-[14px] text-ink placeholder:text-ink-mute focus:outline-none rounded-lg"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-mute hover:text-ink rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Vertical divider */}
            <div aria-hidden className="hidden md:block w-px bg-line my-1.5" />

            {/* Sort segmented control */}
            <div
              role="tablist"
              aria-label="Trier les articles"
              className="flex items-center gap-1 bg-cream rounded-lg p-1"
            >
              {sortOptions.map(({ key, label, icon: Icon }) => {
                const active = sortBy === key && !searchQuery;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSortBy(key);
                      setCurrentPage(1);
                      if (searchQuery) {
                        setSearchInput('');
                        setSearchQuery('');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-bold transition-colors ${
                      active
                        ? 'bg-paper text-brand shadow-card'
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active query chip */}
          {searchQuery && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute"
                style={{ fontFamily: monoFamily }}
              >
                Recherche
              </span>
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-brand-50 text-brand text-[12px] font-semibold">
                "{searchQuery}"
                <button
                  onClick={clearSearch}
                  aria-label="Effacer la recherche"
                  className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-brand/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              <button
                onClick={clearAll}
                className="ml-1 text-[12px] font-semibold text-brand hover:text-brand-700 transition-colors"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>

        {/* — Posts grid — */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-paper rounded-xl2 border border-line overflow-hidden animate-pulse"
              >
                <div className="bg-cream-deep aspect-[16/10]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-cream-deep rounded w-1/3" />
                  <div className="h-5 bg-cream-deep rounded w-5/6" />
                  <div className="h-4 bg-cream-deep rounded w-full" />
                  <div className="h-4 bg-cream-deep rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            {/* Results count */}
            <div className="mb-5 flex items-center justify-between">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute"
                style={{ fontFamily: monoFamily }}
              >
                <span className="tabular-nums text-ink">{posts.length}</span> article
                {posts.length !== 1 ? 's' : ''}
                {totalPages > 1 && (
                  <span className="ml-1.5 text-ink-mute/70">
                    · page <span className="tabular-nums">{currentPage}</span> /{' '}
                    <span className="tabular-nums">{totalPages}</span>
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>

            <BlogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        ) : (
          <EmptyState
            hasSearch={Boolean(searchQuery)}
            onClear={clearAll}
          />
        )}
      </div>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────── */

interface EmptyStateProps {
  hasSearch: boolean;
  onClear: () => void;
}

function EmptyState({ hasSearch, onClear }: EmptyStateProps) {
  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card p-10 md:p-14 text-center">
      <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-cream-deep grid place-items-center">
        <Inbox className="w-7 h-7 text-ink-mute" strokeWidth={2} />
      </div>
      <h3
        className="text-[20px] font-bold text-ink mb-2 tracking-tight"
        style={{ fontFamily: displayFamily }}
      >
        {hasSearch ? 'Aucun article ne correspond' : 'Aucun article pour le moment'}
      </h3>
      <p className="text-[14px] text-ink-mute max-w-md mx-auto mb-6 leading-relaxed">
        {hasSearch
          ? 'Essayez d\'autres mots-clés ou parcourez les articles récents.'
          : 'On prépare les premiers articles. Revenez bientôt pour les lire.'}
      </p>
      {hasSearch && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand text-paper text-[13px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
