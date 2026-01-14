import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Eye, MessageCircle, Clock } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface BlogPostMetaProps {
  post: BlogPost;
}

export default function BlogPostMeta({ post }: BlogPostMetaProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const readTime = calculateReadTime(post.content);

  return (
    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
      {post.author && (
        <Link
          to={`/blog/author/${post.author.id}`}
          className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
        >
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="font-medium">{post.author.name}</span>
        </Link>
      )}
      
      {post.published_at && (
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <time dateTime={post.published_at}>
            {formatDate(post.published_at)}
          </time>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <span>{readTime} min de lecture</span>
      </div>

      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        <span>{post.view_count || 0} vues</span>
      </div>

      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <span>{post.comment_count || 0} commentaires</span>
      </div>
    </div>
  );
}
