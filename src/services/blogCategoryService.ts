import { supabase } from '../lib/supabase-client';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

class BlogCategoryService {
  /**
   * Get all active categories
   */
  async getCategories(): Promise<BlogCategory[]> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching blog categories:', error);
      throw new Error(error.message || 'Failed to fetch blog categories');
    }
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
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
      console.error('Error fetching blog category:', error);
      throw new Error(error.message || 'Failed to fetch blog category');
    }
  }

  /**
   * Get categories with post counts
   */
  async getCategoriesWithCounts(): Promise<BlogCategory[]> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select(`
          *,
          blog_posts(count)
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map((category: any) => ({
        ...category,
        post_count: category.blog_posts?.[0]?.count || 0
      }));
    } catch (error: any) {
      console.error('Error fetching categories with counts:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }
}

export const blogCategoryService = new BlogCategoryService();
