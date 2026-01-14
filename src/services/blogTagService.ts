import { supabase } from '../lib/supabase-client';

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

class BlogTagService {
  /**
   * Get all tags
   */
  async getTags(): Promise<BlogTag[]> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching blog tags:', error);
      throw new Error(error.message || 'Failed to fetch blog tags');
    }
  }

  /**
   * Get tag by slug
   */
  async getTagBySlug(slug: string): Promise<BlogTag | null> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching blog tag:', error);
      throw new Error(error.message || 'Failed to fetch blog tag');
    }
  }

  /**
   * Get popular tags (most used)
   */
  async getPopularTags(limit: number = 20): Promise<BlogTag[]> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select(`
          *,
          blog_post_tags(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((tag: any) => ({
        ...tag,
        post_count: tag.blog_post_tags?.[0]?.count || 0
      })).sort((a, b) => (b.post_count || 0) - (a.post_count || 0));
    } catch (error: any) {
      console.error('Error fetching popular tags:', error);
      throw new Error(error.message || 'Failed to fetch popular tags');
    }
  }

  /**
   * Get tags with post counts
   */
  async getTagsWithCounts(): Promise<BlogTag[]> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select(`
          *,
          blog_post_tags(count)
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map((tag: any) => ({
        ...tag,
        post_count: tag.blog_post_tags?.[0]?.count || 0
      }));
    } catch (error: any) {
      console.error('Error fetching tags with counts:', error);
      throw new Error(error.message || 'Failed to fetch tags');
    }
  }
}

export const blogTagService = new BlogTagService();
