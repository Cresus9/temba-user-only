import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface BlogHeroProps {
  post: BlogPost;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function BlogHero({ post }: BlogHeroProps) {
  // Normalize featured image (support both column names)
  const featuredImage = post.featured_image || post.featured_image_url;
  
  return (
    <div className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            {/* Category */}
            {post.category && (
              <Link to={`/blog/category/${post.category.slug}`}>
                <span
                  className="inline-block px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded"
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
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              {post.author && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-sm font-semibold text-white">
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
                  <span className="font-medium text-gray-900">
                    {post.author.name || 'Temba'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#6366F1]" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>

              {post.read_time_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[#6366F1]" />
                  <span>{post.read_time_minutes} min read</span>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Link
              to={`/blog/post/${post.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-lg hover:shadow-lg transition-all group"
            >
              <span>Read article</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Featured Image */}
          <div className="relative">
            {featuredImage ? (
              <div className="relative overflow-hidden bg-gray-100 rounded-2xl shadow-xl">
                <img
                  src={featuredImage}
                  alt={post.featured_image_alt || post.title}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#E0E7FF] to-[#EDE9FE] rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-9xl font-bold text-[#6366F1] opacity-30">
                  {post.title.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
