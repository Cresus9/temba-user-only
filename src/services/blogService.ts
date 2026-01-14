import { supabase } from '../lib/supabase-client';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  featured_image_url?: string; // Alternative column name
  featured_image_alt?: string;
  author_id: string;
  category_id?: string;
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  view_count: number;
  comment_count: number;
  read_time_minutes?: number;
  allow_comments?: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface BlogPostFilters {
  category_id?: string;
  tag_id?: string;
  author_id?: string;
  search?: string;
  featured?: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface PaginatedBlogPosts {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class BlogService {
  /**
   * Get all published blog posts with pagination
   */
  async getPosts(
    page: number = 1,
    pageSize: number = 12,
    filters?: BlogPostFilters,
    sortBy: 'newest' | 'popular' | 'most_commented' = 'newest'
  ): Promise<PaginatedBlogPosts> {
    try {
      // Build query with all necessary joins
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
              id,
              name,
              slug,
              color,
              icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `, { count: 'exact' })
        .eq('status', 'PUBLISHED'); // Database uses uppercase
      
      // Apply date filter if needed (currently disabled to show all PUBLISHED posts)
      // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      
      // Order by published_at (nulls last)
      query = query.order('published_at', { ascending: false, nullsFirst: false });

      // Apply filters
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.author_id) {
        query = query.eq('author_id', filters.author_id);
      }

      if (filters?.featured) {
        query = query.eq('featured', true);
      }

      if (filters?.search) {
        // Search within title, content, or excerpt (status filter already applied above)
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false });
      } else if (sortBy === 'most_commented') {
        query = query.order('comment_count', { ascending: false });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('BlogService.getPosts error:', error);
        throw error;
      }
      
      console.log('BlogService.getPosts result:', { 
        postCount: data?.length || 0, 
        totalCount: count,
        firstPost: data?.[0] 
      });

      // Transform tags and categories from nested structure
      const posts = (data || []).map((post: any) => ({
        ...post,
        category: post.blog_post_categories?.[0]?.category || null,
        tags: post.blog_post_tags?.map((pt: any) => pt.tag) || []
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);

      return {
        posts,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error: any) {
      console.error('Error fetching blog posts:', error);
      throw new Error(error.message || 'Failed to fetch blog posts');
    }
  }

  /**
   * Get a single blog post by slug
   */
  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
              id,
              name,
              slug,
              color,
              icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq('slug', slug)
        .eq('status', 'PUBLISHED') // Database uses uppercase
        // Note: To enable scheduled posts, uncomment the line below:
        // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Show posts with no date or date <= today
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      // Transform tags and category
      const post: any = {
        ...data,
        category: data.blog_post_categories?.[0]?.category || null,
        tags: data.blog_post_tags?.map((pt: any) => pt.tag) || []
      };

      return post;
    } catch (error: any) {
      console.error('Error fetching blog post:', error);
      throw new Error(error.message || 'Failed to fetch blog post');
    }
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit: number = 3): Promise<BlogPost[]> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
            id,
            name,
            slug,
            color,
            icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq('status', 'PUBLISHED') // Database uses uppercase
        .eq('featured', true)
        // Note: To enable scheduled posts, uncomment the line below:
        // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Show posts with no date or date <= today
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((post: any) => ({
        ...post,
        category: post.blog_post_categories?.[0]?.category || null,
        tags: post.blog_post_tags?.map((pt: any) => pt.tag) || []
      }));
    } catch (error: any) {
      console.error('Error fetching featured posts:', error);
      throw new Error(error.message || 'Failed to fetch featured posts');
    }
  }

  /**
   * Get trending posts (high view count in last 30 days)
   */
  async getTrendingPosts(limit: number = 5): Promise<BlogPost[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
            id,
            name,
            slug,
            color,
            icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq('status', 'PUBLISHED') // Database uses uppercase
        // Note: To enable scheduled posts, uncomment the line below:
        // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Show posts with no date or date <= today
        .gte('published_at', thirtyDaysAgo.toISOString())
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((post: any) => ({
        ...post,
        category: post.blog_post_categories?.[0]?.category || null,
        tags: post.blog_post_tags?.map((pt: any) => pt.tag) || []
      }));
    } catch (error: any) {
      console.error('Error fetching trending posts:', error);
      throw new Error(error.message || 'Failed to fetch trending posts');
    }
  }

  /**
   * Get related posts (same category or tags)
   */
  async getRelatedPosts(postId: string, limit: number = 4): Promise<BlogPost[]> {
    try {
      // Get recent published posts (excluding current post)
      // Note: Full category/tag matching would require more complex queries with the junction table
      
      const query = supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
            id,
            name,
            slug,
            color,
            icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq('status', 'PUBLISHED') // Database uses uppercase
        // Note: To enable scheduled posts, uncomment the line below:
        // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Show posts with no date or date <= today
        .neq('id', postId)
        .order('published_at', { ascending: false })
        .limit(limit);

      // Filter by category if available
      if (post.category_id) {
        query = query.eq('category_id', post.category_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        tags: p.blog_post_tags?.map((pt: any) => pt.tag) || []
      }));
    } catch (error: any) {
      console.error('Error fetching related posts:', error);
      throw new Error(error.message || 'Failed to fetch related posts');
    }
  }

  /**
   * Search blog posts
   */
  async searchPosts(
    query: string,
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedBlogPosts> {
    try {
      const { data, error, count } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles!author_id (
            id,
            name,
            email,
            avatar_url,
            bio
          ),
          blog_post_categories (
            category:blog_categories (
            id,
            name,
            slug,
            color,
            icon
            )
          ),
          blog_post_tags (
            tag:blog_tags (
              id,
              name,
              slug
            )
          )
        `, { count: 'exact' })
        .eq('status', 'PUBLISHED') // Database uses uppercase
        // Note: To enable scheduled posts, uncomment the line below:
        // .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Show posts with no date or date <= today
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .order('published_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const posts = (data || []).map((post: any) => ({
        ...post,
        category: post.blog_post_categories?.[0]?.category || null,
        tags: post.blog_post_tags?.map((pt: any) => pt.tag) || []
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);

      return {
        posts,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error: any) {
      console.error('Error searching blog posts:', error);
      throw new Error(error.message || 'Failed to search blog posts');
    }
  }

  /**
   * Record a view for a blog post
   */
  async recordView(postId: string, sessionId?: string): Promise<void> {
    try {
      // Check if view already recorded for this session
      if (sessionId) {
        const { data: existing } = await supabase
          .from('blog_post_views')
          .select('id')
          .eq('post_id', postId)
          .eq('session_id', sessionId)
          .single();

        if (existing) {
          return; // Already viewed in this session
        }
      }

      // Record view
      await supabase
        .from('blog_post_views')
        .insert({
          post_id: postId,
          session_id: sessionId || null
        });

      // Increment view count
      await supabase.rpc('increment_blog_post_views', {
        post_id: postId
      });
    } catch (error: any) {
      console.error('Error recording view:', error);
      // Don't throw - view tracking is not critical
    }
  }
}

export const blogService = new BlogService();
