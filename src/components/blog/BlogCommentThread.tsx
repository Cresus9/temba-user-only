import React, { useState } from 'react';
import { Reply, User } from 'lucide-react';
import { BlogComment } from '../../services/blogCommentService';
import BlogCommentForm from './BlogCommentForm';
interface BlogCommentThreadProps {
  comment: BlogComment;
  postId: string;
  onReply: () => void;
}

export default function BlogCommentThread({
  comment,
  postId,
  onReply
}: BlogCommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'à l\'instant';
      if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} min`;
      if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)} h`;
      if (diffInSeconds < 604800) return `il y a ${Math.floor(diffInSeconds / 86400)} j`;
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    onReply();
  };

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      {/* Main Comment */}
      <div className="mb-4">
        <div className="flex items-start gap-3 mb-2">
          {comment.author?.avatar_url ? (
            <img
              src={comment.author.avatar_url}
              alt={comment.author.name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {comment.author_name}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.created_at)}
              </span>
            </div>
            
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Reply className="h-4 w-4" />
              Répondre
            </button>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="ml-12 mt-4">
            <BlogCommentForm
              postId={postId}
              parentId={comment.id}
              onSuccess={handleReplySuccess}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="border-l-2 border-gray-100 pl-4">
              <div className="flex items-start gap-3">
                {reply.author?.avatar_url ? (
                  <img
                    src={reply.author.avatar_url}
                    alt={reply.author.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {reply.author_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
