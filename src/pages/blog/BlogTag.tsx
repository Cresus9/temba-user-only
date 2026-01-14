import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Tag } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import { blogTagService } from '../../services/blogTagService';
import type { BlogTag as BlogTagType } from '../../services/blogTagService';
import BlogPostCard from '../../components/blog/BlogPostCard';
import BlogPagination from '../../components/blog/BlogPagination';
import toast from 'react-hot-toast';

export default function BlogTag() {
  const { slug } = useParams<{ slug: string }>();
  const [tag, setTag] = useState<BlogTagType | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (slug) {
      loadTag();
      loadPosts();
    }
  }, [slug, currentPage]);

  const loadTag = async () => {
    if (!slug) return;

    try {
      const tagData = await blogTagService.getTagBySlug(slug);
      if (!tagData) {
        toast.error('Tag non trouvé');
        return;
      }
      setTag(tagData);
    } catch (error: any) {
      console.error('Error loading tag:', error);
      toast.error('Erreur lors du chargement du tag');
    }
  };

  const loadPosts = async () => {
    if (!slug || !tag) return;

    try {
      setLoading(true);
      // Note: This assumes blogService.getPosts supports tag filtering
      // You may need to adjust the service method
      const postsData = await blogService.getPosts(currentPage, 12, { tag_id: tag.id });
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

  if (loading && !tag) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tag non trouvé</h1>
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
      <div className="bg-indigo-600 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au blog
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <Tag className="h-8 w-8" />
            <h1 className="text-4xl md:text-5xl font-bold">#{tag.name}</h1>
          </div>

          {tag.post_count !== undefined && (
            <p className="text-xl text-white/90">
              {tag.post_count} article{tag.post_count > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Aucun article avec ce tag pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
