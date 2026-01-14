import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, Clock, Calendar } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import BlogHero from '../../components/blog/BlogHero';
import BlogPostCard from '../../components/blog/BlogPostCard';
import toast from 'react-hot-toast';

export default function BlogHome() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 9;

  useEffect(() => {
    loadPosts();
    loadFeaturedPost();
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
        const searchResults = await blogService.searchPosts(searchQuery, currentPage, postsPerPage);
        postsData = searchResults;
      } else {
        switch (sortBy) {
          case 'trending':
            postsData = await blogService.getTrendingPosts(currentPage, postsPerPage);
            break;
          case 'popular':
            postsData = await blogService.getPosts(currentPage, postsPerPage, undefined, 'popular');
            break;
          default:
            postsData = await blogService.getPosts(currentPage, postsPerPage, undefined, 'newest');
        }
      }

      console.log('BlogHome - Posts data received:', postsData);
      
      setPosts(postsData.posts || []);
      setTotalPages(postsData.totalPages || 1);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPosts();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Featured Post Hero */}
      {featuredPost && (
        <div className="border-b border-gray-200">
          <BlogHero post={featuredPost} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Search and Filter Bar */}
        <div className="mb-12">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-[#6366F1] focus:ring-0 transition-colors"
              />
            </div>
          </form>

          {/* Sort Options */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === 'latest'
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Latest
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === 'popular'
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Popular
            </button>
            <button
              onClick={() => setSortBy('trending')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === 'trending'
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Trending
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-100 h-64 mb-4 rounded-lg"></div>
                <div className="h-4 bg-gray-100 mb-2 rounded"></div>
                <div className="h-4 bg-gray-100 w-2/3 rounded"></div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-16">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-[#6366F1] hover:text-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        currentPage === i + 1
                          ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-md'
                          : 'border border-gray-200 text-gray-700 hover:border-[#6366F1] hover:text-[#6366F1]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:border-[#6366F1] hover:text-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-[#E0E7FF] to-[#EDE9FE] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[#6366F1]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSortBy('latest');
                  setCurrentPage(1);
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
