import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface BlogPostCardProps {
  post: BlogPost;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function BlogPostCard({ post }: BlogPostCardProps) {
  // Normalize featured image (support both column names)
  const featuredImage = post.featured_image || post.featured_image_url;
  
  return (
    <Link to={`/blog/post/${post.slug}`} className="group block">
      <article className="h-full">
        {/* Featured Image */}
        <div className="relative overflow-hidden mb-4 bg-gray-100 rounded-lg">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={post.featured_image_alt || post.title}
              className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-[#E0E7FF] to-[#EDE9FE]">
              <span className="text-6xl font-bold text-[#6366F1] opacity-30">
                {post.title.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Category Badge */}
          {post.category && (
            <div className="absolute top-4 left-4">
              <span
                className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded"
                style={{
                  backgroundColor: post.category.color || '#6366F1',
                  color: '#fff'
                }}
              >
                {post.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 uppercase tracking-wide">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#6366F1]" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            {post.read_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6366F1]" />
                {post.read_time_minutes} min
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#6366F1] transition-colors">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-gray-600 leading-relaxed line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Author */}
          {post.author && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-xs font-semibold text-white">
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
              <span className="text-sm text-gray-600 font-medium">
                {post.author.name || 'Temba'}
              </span>
            </div>
          )}

          {/* Read More Indicator */}
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6366F1] opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Read more</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </article>
    </Link>
  );
}
