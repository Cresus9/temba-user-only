import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogService, BlogPost } from '../../services/blogService';

interface RelatedPostsSectionProps {
  postId: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function RelatedPostsSection({ postId }: RelatedPostsSectionProps) {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedPosts();
  }, [postId]);

  const loadRelatedPosts = async () => {
    try {
      setLoading(true);
      const posts = await blogService.getRelatedPosts(postId, 3);
      setRelatedPosts(posts);
    } catch (error: any) {
      console.error('Error loading related posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-48 mb-4 rounded-lg"></div>
            <div className="h-4 bg-gray-200 mb-2 rounded"></div>
            <div className="h-4 bg-gray-200 w-2/3 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-12">
        More from the blog
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {relatedPosts.map((post) => {
          // Normalize featured image (support both column names)
          const featuredImage = post.featured_image || post.featured_image_url;
          
          return (
            <Link
              key={post.id}
              to={`/blog/post/${post.slug}`}
              className="group block"
            >
              <article>
                {/* Image */}
                <div className="relative overflow-hidden mb-4 bg-gray-100 rounded-lg">
                  {featuredImage ? (
                    <img
                      src={featuredImage}
                      alt={post.featured_image_alt || post.title}
                      className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                  <div className="w-full aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-[#E0E7FF] to-[#EDE9FE]">
                    <span className="text-5xl font-bold text-[#6366F1] opacity-30">
                      {post.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                {post.category && (
                  <span
                    className="inline-block px-2 py-1 text-xs font-semibold tracking-wide uppercase rounded"
                    style={{
                      backgroundColor: post.category.color || '#6366F1',
                      color: '#fff'
                    }}
                  >
                    {post.category.name}
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-[#6366F1] transition-colors line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-sm text-gray-500">
                  {formatDate(post.published_at || post.created_at)}
                </p>
              </div>
            </article>
          </Link>
        );
        })}
      </div>
    </div>
  );
}
