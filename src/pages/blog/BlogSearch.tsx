import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import BlogPostCard from '../../components/blog/BlogPostCard';
import BlogPagination from '../../components/blog/BlogPagination';
import toast from 'react-hot-toast';

export default function BlogSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      setQuery(searchQuery);
      performSearch(searchQuery, currentPage);
    }
  }, [searchParams, currentPage]);

  const performSearch = async (searchQuery: string, page: number) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await blogService.searchPosts(searchQuery, page, 12);
      setPosts(results.posts);
      setTotalPages(results.totalPages);
      setTotalResults(results.total);
    } catch (error: any) {
      console.error('Error searching posts:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Veuillez entrer un terme de recherche');
      return;
    }
    setCurrentPage(1);
    setSearchParams({ q: query, page: '1' });
    performSearch(query, 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchParams({ q: query, page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au blog
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-8">Recherche</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des articles..."
                className="w-full pl-12 pr-4 py-4 border-0 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-indigo-600 px-6 py-2 rounded-md hover:bg-gray-100 transition-colors font-medium"
              >
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {query && (
          <div className="mb-6">
            <p className="text-gray-600">
              {loading ? (
                'Recherche en cours...'
              ) : totalResults > 0 ? (
                <>
                  {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''} pour "{query}"
                </>
              ) : (
                `Aucun résultat pour "${query}"`
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
            <BlogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : query ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              Aucun résultat trouvé pour "{query}"
            </p>
            <p className="text-gray-400 text-sm">
              Essayez avec d'autres mots-clés ou retournez à la page d'accueil du blog.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Entrez un terme de recherche pour commencer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
