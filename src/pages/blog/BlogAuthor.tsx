import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import BlogPostCard from '../../components/blog/BlogPostCard';
import BlogPagination from '../../components/blog/BlogPagination';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';

interface Author {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
}

export default function BlogAuthor() {
  const { authorId } = useParams<{ authorId: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (authorId) {
      loadAuthor();
      loadPosts();
    }
  }, [authorId, currentPage]);

  const loadAuthor = async () => {
    if (!authorId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authorId)
        .single();

      if (error) throw error;

      setAuthor({
        id: authorId,
        name: data.name,
        email: data.email,
        avatar_url: data.avatar_url,
        bio: data.bio
      });
    } catch (error: any) {
      console.error('Error loading author:', error);
      toast.error('Erreur lors du chargement de l\'auteur');
    }
  };

  const loadPosts = async () => {
    if (!authorId) return;

    try {
      setLoading(true);
      const postsData = await blogService.getPosts(currentPage, 12, { author_id: authorId });
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

  if (loading && !author) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Auteur non trouvé</h1>
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au blog
          </Link>

          <div className="flex items-start gap-6">
            {author.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.name}
                className="h-24 w-24 rounded-full border-4 border-white/20"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20">
                <User className="h-12 w-12" />
              </div>
            )}

            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{author.name}</h1>
              {author.bio && (
                <p className="text-xl text-white/90 max-w-3xl mb-4">
                  {author.bio}
                </p>
              )}
              <div className="flex items-center gap-4 text-white/80">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {author.email}
                </span>
                <span>{posts.length} article{posts.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
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
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Aucun article publié par cet auteur pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
