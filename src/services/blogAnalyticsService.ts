import { supabase } from '../lib/supabase-client';

class BlogAnalyticsService {
  /**
   * Get or create a session ID for tracking
   */
  getSessionId(): string {
    const storageKey = 'blog_session_id';
    let sessionId = localStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
  }

  /**
   * Track page view
   */
  async trackPageView(postId: string): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      await supabase.rpc('record_blog_post_view', {
        p_post_id: postId,
        p_session_id: sessionId
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
      // Don't throw - analytics is not critical
    }
  }

  /**
   * Track read time
   */
  async trackReadTime(postId: string, readTimeSeconds: number): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      await supabase
        .from('blog_post_analytics')
        .upsert({
          post_id: postId,
          session_id: sessionId,
          read_time_seconds: readTimeSeconds,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking read time:', error);
      // Don't throw - analytics is not critical
    }
  }
}

export const blogAnalyticsService = new BlogAnalyticsService();
