import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { blogCommentService, BlogComment } from '../../services/blogCommentService';
import BlogCommentForm from './BlogCommentForm';
import BlogCommentThread from './BlogCommentThread';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface BlogCommentSectionProps {
  postId: string;
}

export default function BlogCommentSection({ postId }: BlogCommentSectionProps) {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await blogCommentService.getPostComments(postId);
      setComments(commentsData);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      // Don't show error toast - comments may not be set up yet
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmitted = () => {
    setShowForm(false);
    loadComments();
    toast.success('Votre commentaire a été soumis et sera publié après modération.');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-6 w-6 text-[#6366F1]" />
        <h2 className="text-2xl font-bold text-gray-900">
          Commentaires ({comments.length})
        </h2>
      </div>

      {/* Comment Form */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-8 px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-lg hover:from-[#5558E3] hover:to-[#7C3AED] transition-colors font-semibold shadow-md"
        >
          {isAuthenticated ? 'Ajouter un commentaire' : 'Ajouter un commentaire (invité)'}
        </button>
      )}

      {showForm && (
        <div className="mb-8">
          <BlogCommentForm
            postId={postId}
            onSuccess={handleCommentSubmitted}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <BlogCommentThread
              key={comment.id}
              comment={comment}
              postId={postId}
              onReply={loadComments}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-[#6366F1]" />
          </div>
          <p className="text-gray-600 mb-2 font-medium">Aucun commentaire pour le moment</p>
          <p className="text-gray-500 text-sm">Soyez le premier à partager votre avis !</p>
        </div>
      )}
    </div>
  );
}
