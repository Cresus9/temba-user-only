// Image optimization utility for the frontend
import { supabase } from '../lib/supabase-client';

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

class ImageOptimizerService {
  private baseUrl: string;
  private cache = new Map<string, string>();

  constructor() {
    // Get Supabase URL and construct image optimizer endpoint
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.baseUrl = `${supabaseUrl}/functions/v1/image-optimizer`;
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(originalUrl: string, options: ImageOptimizationOptions = {}): string {
    if (!originalUrl) return '';

    // Default options
    const opts = {
      quality: 80,
      format: 'webp' as const,
      ...options,
    };

    // Create cache key
    const cacheKey = `${originalUrl}_${opts.width || 'auto'}_${opts.height || 'auto'}_${opts.quality}_${opts.format}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Build optimization URL
    const params = new URLSearchParams();
    params.append('url', originalUrl);
    
    if (opts.width) params.append('width', opts.width.toString());
    if (opts.height) params.append('height', opts.height.toString());
    params.append('quality', opts.quality.toString());
    params.append('format', opts.format);

    const optimizedUrl = `${this.baseUrl}?${params.toString()}`;
    
    // Cache the result
    this.cache.set(cacheKey, optimizedUrl);
    
    return optimizedUrl;
  }

  /**
   * Get multiple sizes for responsive images
   */
  getResponsiveSizes(originalUrl: string, sizes: Array<{ width: number; height?: number; label: string }>): Record<string, string> {
    const responsiveUrls: Record<string, string> = {};
    
    sizes.forEach(size => {
      responsiveUrls[size.label] = this.getOptimizedUrl(originalUrl, {
        width: size.width,
        height: size.height,
        quality: 80,
        format: 'webp',
      });
    });
    
    return responsiveUrls;
  }

  /**
   * Preload critical images
   */
  async preloadImage(url: string, options: ImageOptimizationOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const optimizedUrl = this.getOptimizedUrl(url, options);
      
      img.onload = () => {
        console.log('✅ Preloaded:', url);
        resolve();
      };
      
      img.onerror = () => {
        console.warn('❌ Failed to preload:', url);
        reject(new Error(`Failed to preload image: ${url}`));
      };
      
      img.src = optimizedUrl;
    });
  }

  /**
   * Preload multiple images with priority
   */
  async preloadImages(urls: Array<{ url: string; options?: ImageOptimizationOptions; priority?: number }>): Promise<void> {
    // Sort by priority (higher priority first)
    const sortedUrls = urls.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Preload in batches to avoid overwhelming the browser
    const batchSize = 3;
    for (let i = 0; i < sortedUrls.length; i += batchSize) {
      const batch = sortedUrls.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(item => this.preloadImage(item.url, item.options))
      );
      
      // Small delay between batches
      if (i + batchSize < sortedUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Track image access for analytics
   */
  async trackImageAccess(imageUrl: string, eventId?: string, imageType: string = 'main'): Promise<void> {
    try {
      await supabase.rpc('track_image_access', {
        p_image_url: imageUrl,
        p_event_id: eventId || null,
        p_image_type: imageType,
      });
    } catch (error) {
      console.warn('Failed to track image access:', error);
    }
  }

  /**
   * Get event image variants for different use cases
   */
  getEventImageVariants(originalUrl: string) {
    if (!originalUrl) {
      return {
        thumbnail: '',
        card: '',
        detail: '',
        banner: '',
      };
    }

    return {
      thumbnail: this.getOptimizedUrl(originalUrl, { width: 200, height: 150, quality: 70 }),
      card: this.getOptimizedUrl(originalUrl, { width: 400, height: 300, quality: 80 }),
      detail: this.getOptimizedUrl(originalUrl, { width: 800, height: 600, quality: 85 }),
      banner: this.getOptimizedUrl(originalUrl, { width: 1200, height: 400, quality: 80 }),
    };
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizerService();

// Export utility functions
export const getOptimizedImageUrl = (url: string, options?: ImageOptimizationOptions) => 
  imageOptimizer.getOptimizedUrl(url, options);

export const getEventImageVariants = (url: string) => 
  imageOptimizer.getEventImageVariants(url);

export const preloadEventImages = async (urls: string[], eventId?: string) => {
  const imagesToPreload = urls.map((url, index) => ({
    url,
    options: { width: 400, height: 300, quality: 80 },
    priority: urls.length - index, // First images have higher priority
  }));
  
  await imageOptimizer.preloadImages(imagesToPreload);
  
  // Track access for popular images
  urls.forEach(url => {
    imageOptimizer.trackImageAccess(url, eventId, 'main');
  });
};

export default imageOptimizer;
