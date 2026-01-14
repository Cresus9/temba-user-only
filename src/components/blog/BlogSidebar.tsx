import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, Tag, TrendingUp } from 'lucide-react';
import { BlogCategory } from '../../services/blogCategoryService';
import { BlogTag } from '../../services/blogTagService';
import { BlogPost } from '../../services/blogService';

interface BlogSidebarProps {
  categories: BlogCategory[];
  tags: BlogTag[];
  trendingPosts: BlogPost[];
}

export default function BlogSidebar({ categories, tags, trendingPosts }: BlogSidebarProps) {
  return (
    <div className="space-y-8">
      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Folder className="h-5 w-5 text-indigo-600" />
            Catégories
          </h3>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/blog/category/${category.slug}`}
                  className="flex items-center justify-between text-gray-700 hover:text-indigo-600 transition-colors py-2"
                >
                  <span className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.name}</span>
                  </span>
                  {category.post_count !== undefined && (
                    <span className="text-sm text-gray-500">({category.post_count})</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular Tags */}
      {tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            Tags populaires
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/blog/tag/${tag.slug}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending Posts */}
      {trendingPosts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Articles tendance
          </h3>
          <ul className="space-y-4">
            {trendingPosts.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/blog/post/${post.slug}`}
                  className="block hover:text-indigo-600 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 hover:text-indigo-600 line-clamp-2 mb-1">
                    {post.title}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {post.view_count || 0} vues
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
