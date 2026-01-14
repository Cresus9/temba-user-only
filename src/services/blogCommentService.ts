import { supabase } from '../lib/supabase-client';

export interface BlogComment {
  id: string;
  post_id: string;
  user_id?: string;
  // parent_id?: string; // Not yet implemented in database
  author_name: string;
  author_email?: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  replies?: BlogComment[]; // For future threaded comments
}

class BlogCommentService {
  /**
   * Get approved comments for a post
   */
  async getPostComments(postId: string): Promise<BlogComment[]> {
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select(`
          *,
          author:profiles!user_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .eq('status', 'APPROVED')
        // .is('parent_id', null) // Only top-level comments (when threaded comments are implemented)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const comments = (data || []).map((comment: any) => ({
        ...comment,
        author: comment.author || null,
        replies: [] // No threaded comments yet
      }));

      return comments;
    } catch (error: any) {
      console.error('Error fetching post comments:', error);
      throw new Error(error.message || 'Failed to fetch comments');
    }
  }

  /**
   * Get replies for a comment
   * Note: Threaded comments not yet implemented in database
   */
  async getCommentReplies(commentId: string): Promise<BlogComment[]> {
    // TODO: Add parent_id column to blog_comments table for threaded comments
    return []; // No threaded comments yet
  }

  /**
   * Submit a comment (authenticated user)
   */
  async submitComment(
    postId: string,
    content: string,
    parentId?: string
  ): Promise<BlogComment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Comment content is required');
      }

      if (content.length > 2000) {
        throw new Error('Comment must be less than 2000 characters');
      }

      // Simple spam detection
      const spamKeywords = ['spam', 'casino', 'viagra', 'bitcoin'];
      const isSpam = spamKeywords.some(keyword =>
        content.toLowerCase().includes(keyword)
      );

      const { data, error } = await supabase
        .from('blog_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          // parent_id: parentId || null, // Not yet implemented
          author_name: profile.name,
          author_email: profile.email,
          content: content.trim(),
          status: isSpam ? 'SPAM' : 'PENDING'
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      throw new Error(error.message || 'Failed to submit comment');
    }
  }

  /**
   * Submit a guest comment
   */
  async submitGuestComment(
    postId: string,
    content: string,
    guestName: string,
    guestEmail: string,
    parentId?: string
  ): Promise<BlogComment> {
    try {
      // Validate inputs
      if (!content || content.trim().length === 0) {
        throw new Error('Comment content is required');
      }

      if (content.length > 2000) {
        throw new Error('Comment must be less than 2000 characters');
      }

      if (!guestName || guestName.trim().length === 0) {
        throw new Error('Name is required');
      }

      if (!guestEmail || !guestEmail.includes('@')) {
        throw new Error('Valid email is required');
      }

      // Simple spam detection
      const spamKeywords = ['spam', 'casino', 'viagra', 'bitcoin'];
      const isSpam = spamKeywords.some(keyword =>
        content.toLowerCase().includes(keyword)
      );

      const { data, error } = await supabase
        .from('blog_comments')
        .insert({
          post_id: postId,
          // parent_id: parentId || null, // Not yet implemented
          author_name: guestName.trim(),
          author_email: guestEmail.trim().toLowerCase(),
          content: content.trim(),
          status: isSpam ? 'SPAM' : 'PENDING' // Guest comments always pending moderation
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error submitting guest comment:', error);
      throw new Error(error.message || 'Failed to submit guest comment');
    }
  }

  /**
   * Get comment count for a post
   */
  async getCommentCount(postId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('blog_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('status', 'APPROVED');

      if (error) throw error;

      return count || 0;
    } catch (error: any) {
      console.error('Error fetching comment count:', error);
      return 0;
    }
  }

  /**
   * Delete a comment (authenticated user can delete their own comments)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('blog_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      throw new Error(error.message || 'Failed to delete comment');
    }
  }

  /**
   * Report a comment (for moderation)
   */
  async reportComment(commentId: string, reason: string): Promise<void> {
    try {
      // TODO: Implement comment reporting system
      console.log(`Comment ${commentId} reported for: ${reason}`);
    } catch (error: any) {
      console.error('Error reporting comment:', error);
      throw new Error(error.message || 'Failed to report comment');
    }
  }
}

export const blogCommentService = new BlogCommentService();
export default blogCommentService;
