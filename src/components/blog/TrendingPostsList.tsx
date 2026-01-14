import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Eye } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface TrendingPostsListProps {
  posts: BlogPost[];
}

export default function TrendingPostsList({ posts }: TrendingPostsListProps) {
  if (posts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-600" />
        Articles tendance
      </h3>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
            <Link
              to={`/blog/post/${post.slug}`}
              className="block hover:text-indigo-600 transition-colors"
            >
              <h4 className="font-medium text-gray-900 hover:text-indigo-600 line-clamp-2 mb-2">
                {post.title}
              </h4>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {post.view_count || 0} vues
                </span>
                {post.category && (
                  <span
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: post.category.color || '#6366f1' }}
                  >
                    {post.category.name}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
