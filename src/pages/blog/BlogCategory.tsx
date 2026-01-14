import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Folder } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import { blogCategoryService } from '../../services/blogCategoryService';
import type { BlogCategory as BlogCategoryType } from '../../services/blogCategoryService';
import BlogPostCard from '../../components/blog/BlogPostCard';
import BlogPagination from '../../components/blog/BlogPagination';
import toast from 'react-hot-toast';

export default function BlogCategory() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<BlogCategoryType | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'most_commented'>('newest');

  useEffect(() => {
    if (slug) {
      loadCategory();
      loadPosts();
    }
  }, [slug, currentPage, sortBy]);

  const loadCategory = async () => {
    if (!slug) return;

    try {
      const categoryData = await blogCategoryService.getCategoryBySlug(slug);
      if (!categoryData) {
        toast.error('Catégorie non trouvée');
        return;
      }
      setCategory(categoryData);
    } catch (error: any) {
      console.error('Error loading category:', error);
      toast.error('Erreur lors du chargement de la catégorie');
    }
  };

  const loadPosts = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      const postsData = await blogService.getPosts(
        currentPage,
        12,
        { category_id: category?.id },
        sortBy
      );
      setPosts(postsData.posts);
      setTotalPages(postsData.totalPages);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Catégorie non trouvée</h1>
          <Link to="/blog" className="text-indigo-600 hover:text-indigo-700">
            Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-16 text-white"
        style={{ backgroundColor: category.color || '#6366f1' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au blog
          </Link>

          <div className="flex items-center gap-4 mb-4">
            {category.icon && <span className="text-4xl">{category.icon}</span>}
            <h1 className="text-4xl md:text-5xl font-bold">{category.name}</h1>
          </div>

          {category.description && (
            <p className="text-xl text-white/90 max-w-3xl">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Sort Options */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-600">Trier par:</span>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'newest'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Plus récents
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Plus populaires
          </button>
          <button
            onClick={() => setSortBy('most_commented')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'most_commented'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Plus commentés
          </button>
        </div>

        {/* Posts Grid */}
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
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Aucun article dans cette catégorie pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
