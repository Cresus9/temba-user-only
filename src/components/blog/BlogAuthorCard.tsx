import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail } from 'lucide-react';

interface Author {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
}

interface BlogAuthorCardProps {
  author: Author;
}

export default function BlogAuthorCard({ author }: BlogAuthorCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex items-start gap-4">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-8 w-8 text-indigo-600" />
          </div>
        )}

        <div className="flex-1">
          <Link
            to={`/blog/author/${author.id}`}
            className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
          >
            {author.name}
          </Link>
          
          {author.bio && (
            <p className="text-gray-600 mt-2">{author.bio}</p>
          )}

          <Link
            to={`/blog/author/${author.id}`}
            className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Voir tous les articles →
          </Link>
        </div>
      </div>
    </div>
  );
}
