import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Eye, MessageCircle, ChevronRight, Share2 } from 'lucide-react';
import { blogService, BlogPost as BlogPostType } from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import BlogPostContent from '../../components/blog/BlogPostContent';
import BlogCommentSection from '../../components/blog/BlogCommentSection';
import RelatedPostsSection from '../../components/blog/RelatedPostsSection';
import SocialShareButtons from '../../components/blog/SocialShareButtons';
import SEOHead from '../../components/blog/SEOHead';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    loadPost();
  }, [slug]);

  useEffect(() => {
    if (post) {
      const wordsPerMinute = 200;
      const words = post.content.split(/\s+/).length;
      setReadTime(Math.ceil(words / wordsPerMinute));
    }
  }, [post]);

  const loadPost = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      const postData = await blogService.getPostBySlug(slug);
      
      if (!postData) {
        toast.error('Article not found');
        navigate('/blog');
        return;
      }

      // Debug: Log the post data to check featured_image
      console.log('BlogPost - Loaded post data:', {
        title: postData.title,
        featured_image: postData.featured_image,
        featured_image_url: postData.featured_image_url,
        featured_image_alt: postData.featured_image_alt,
        allKeys: Object.keys(postData)
      });
      
      // Normalize featured_image field (support both column names)
      if (postData.featured_image_url && !postData.featured_image) {
        postData.featured_image = postData.featured_image_url;
      }
      
      setPost(postData);
    } catch (error: any) {
      console.error('Error loading post:', error);
      toast.error('Error loading article');
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-100 w-1/4 rounded"></div>
            <div className="h-12 bg-gray-100 w-3/4 rounded"></div>
            <div className="h-96 bg-gray-100 rounded-2xl"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded"></div>
              <div className="h-4 bg-gray-100 rounded"></div>
              <div className="h-4 bg-gray-100 w-5/6 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ''}
        image={post.featured_image}
        url={`/blog/post/${post.slug}`}
        type="article"
      />

      {/* Breadcrumb */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-[#6366F1] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/blog" className="hover:text-[#6366F1] transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium truncate">
              {post.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Category */}
        {post.category && (
          <Link to={`/blog/category/${post.category.slug}`} className="inline-block mb-6">
            <span
              className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded"
              style={{
                backgroundColor: post.category.color || '#6366F1',
                color: '#fff'
              }}
            >
              {post.category.name}
            </span>
          </Link>
        )}

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 pb-8 mb-8 border-b border-gray-200">
          {post.author && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-sm font-semibold text-white">
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  post.author.name?.charAt(0) || 'T'
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {post.author.name || 'Temba'}
                </p>
                <p className="text-sm text-gray-500">Author</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-[#6366F1]" />
              <span>{formatDate(post.published_at || post.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#6366F1]" />
              <span>{post.read_time_minutes} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-gray-400" />
              <span>{post.view_count || 0} views</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-12 relative group">
            <img
              src={post.featured_image}
              alt={post.featured_image_alt || post.title}
              className="w-full h-auto rounded-2xl shadow-xl"
            />
            {post.featured_image_alt && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-2xl p-6">
                <p className="text-white text-sm font-medium text-center">
                  {post.featured_image_alt}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Social Share */}
        <div className="mb-12">
          <SocialShareButtons
            url={window.location.href}
            title={post.title}
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-16">
          <BlogPostContent content={post.content} />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-12 pb-12 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/blog/tag/${tag.slug}`}
                  className="px-4 py-2 border-2 border-gray-200 text-sm text-gray-700 hover:border-[#6366F1] hover:text-[#6366F1] transition-colors rounded-full"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio */}
        {post.author?.bio && (
          <div className="mb-12 pb-12 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-xl font-semibold text-white flex-shrink-0">
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  post.author.name?.charAt(0) || 'T'
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {post.author.name}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  {post.author.bio}
                </p>
                <Link
                  to={`/blog/author/${post.author.id}`}
                  className="text-sm font-semibold text-[#6366F1] hover:text-[#8B5CF6] transition-colors inline-flex items-center gap-1"
                >
                  View all articles
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Related Posts */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RelatedPostsSection postId={post.id} />
        </div>
      </div>

      {/* Comments */}
      {post.allow_comments && (
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <BlogCommentSection postId={post.id} />
          </div>
        </div>
      )}
    </div>
  );
}
