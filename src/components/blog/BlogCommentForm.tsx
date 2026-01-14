import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { blogCommentService } from '../../services/blogCommentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface BlogCommentFormProps {
  postId: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function BlogCommentForm({
  postId,
  parentId,
  onSuccess,
  onCancel
}: BlogCommentFormProps) {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    if (content.length > 2000) {
      toast.error('Le commentaire ne peut pas dépasser 2000 caractères');
      return;
    }

    try {
      setLoading(true);

      if (isAuthenticated) {
        await blogCommentService.submitComment(postId, content, parentId);
      } else {
        if (!authorName.trim() || !authorEmail.trim()) {
          toast.error('Veuillez remplir tous les champs');
          return;
        }
        await blogCommentService.submitGuestComment(
          postId,
          authorName.trim(),
          authorEmail.trim(),
          content,
          parentId
        );
      }

      setContent('');
      setAuthorName('');
      setAuthorEmail('');
      onSuccess();
    } catch (error: any) {
      // Show user-friendly error messages
      if (error.message.includes('email')) {
        toast.error('Veuillez entrer une adresse email valide');
      } else if (error.message.includes('Name')) {
        toast.error('Veuillez entrer votre nom');
      } else if (error.message.includes('content')) {
        toast.error('Veuillez écrire un commentaire');
      } else {
        toast.error('Erreur lors de l\'envoi du commentaire');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <input
              type="text"
              id="authorName"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Votre nom"
              required
              minLength={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1]"
            />
          </div>
          <div>
            <label htmlFor="authorEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="authorEmail"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1]"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Commentaire *
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] resize-none"
          placeholder="Écrivez votre commentaire ici... (minimum 10 caractères)"
        />
        <p className="text-xs text-gray-500 mt-1">
          {content.length}/2000 caractères
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-lg hover:from-[#5558E3] hover:to-[#7C3AED] transition-all font-semibold shadow-md disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Envoi...' : 'Publier le commentaire'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
          >
            <X className="h-4 w-4" />
            Annuler
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        * Votre commentaire sera publié après modération.
      </p>
    </form>
  );
}
