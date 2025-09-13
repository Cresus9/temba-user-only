import { imagePreloader } from './imagePreloader';

interface WarmCacheOptions {
  featuredEvents?: Array<{ image_url: string; title: string }>;
  categories?: Array<{ image_url: string; name: string }>;
  bannerImages?: string[];
}

/**
 * Warms the image cache with critical images for instant loading
 */
export class ImageCacheWarmer {
  private isWarming = false;
  private warmedImages = new Set<string>();

  /**
   * Warm cache with critical images
   */
  async warmCache(options: WarmCacheOptions): Promise<void> {
    if (this.isWarming) {
      console.log('🔥 Cache warming already in progress...');
      return;
    }

    this.isWarming = true;
    console.log('🔥 Starting image cache warming...');

    try {
      const tasks: Promise<any>[] = [];

      // 1. Warm featured events (highest priority)
      if (options.featuredEvents && options.featuredEvents.length > 0) {
        const featuredTask = this.warmFeaturedEvents(options.featuredEvents);
        tasks.push(featuredTask);
      }

      // 2. Warm category images
      if (options.categories && options.categories.length > 0) {
        const categoryTask = this.warmCategoryImages(options.categories);
        tasks.push(categoryTask);
      }

      // 3. Warm banner images
      if (options.bannerImages && options.bannerImages.length > 0) {
        const bannerTask = this.warmBannerImages(options.bannerImages);
        tasks.push(bannerTask);
      }

      // Execute all warming tasks
      const results = await Promise.allSettled(tasks);
      
      // Log results
      results.forEach((result, index) => {
        const taskNames = ['featured events', 'categories', 'banners'];
        if (result.status === 'fulfilled') {
          console.log(`✅ ${taskNames[index]} cache warming completed`);
        } else {
          console.warn(`⚠️ ${taskNames[index]} cache warming failed:`, result.reason);
        }
      });

      console.log('🔥 Cache warming completed!');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm featured event images (card and detail sizes)
   */
  private async warmFeaturedEvents(events: Array<{ image_url: string; title: string }>): Promise<void> {
    console.log('🔥 Warming featured event images...');
    
    // Take first 6 events for immediate warming
    const priorityEvents = events.slice(0, 6);
    
    // Warm card-sized images (most common)
    await imagePreloader.preloadImages(
      priorityEvents.map(e => e.image_url),
      {
        width: 400,
        height: 300,
        quality: 85,
        batchSize: 3,
        delay: 100
      }
    );

    // Warm detail-sized images in background (for when users click)
    setTimeout(() => {
      imagePreloader.preloadImages(
        priorityEvents.map(e => e.image_url),
        {
          width: 800,
          height: 600,
          quality: 90,
          batchSize: 2,
          delay: 200
        }
      );
    }, 2000);
  }

  /**
   * Warm category images
   */
  private async warmCategoryImages(categories: Array<{ image_url: string; name: string }>): Promise<void> {
    console.log('🔥 Warming category images...');
    
    await imagePreloader.preloadImages(
      categories.map(c => c.image_url),
      {
        width: 300,
        height: 200,
        quality: 80,
        batchSize: 4,
        delay: 50
      }
    );
  }

  /**
   * Warm banner/hero images
   */
  private async warmBannerImages(bannerUrls: string[]): Promise<void> {
    console.log('🔥 Warming banner images...');
    
    await imagePreloader.preloadImages(bannerUrls, {
      width: 1200,
      height: 600,
      quality: 90,
      batchSize: 2,
      delay: 300
    });
  }

  /**
   * Warm images on user interaction (hover, scroll)
   */
  async warmOnInteraction(imageUrls: string[], options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}): Promise<void> {
    const filteredUrls = imageUrls.filter(url => !this.warmedImages.has(url));
    
    if (filteredUrls.length === 0) return;

    console.log(`🔥 Warming ${filteredUrls.length} images on interaction...`);
    
    await imagePreloader.preloadImages(filteredUrls, {
      width: 600,
      height: 400,
      quality: 85,
      batchSize: 2,
      delay: 100,
      ...options
    });

    // Mark as warmed
    filteredUrls.forEach(url => this.warmedImages.add(url));
  }

  /**
   * Get warming statistics
   */
  getStats(): { isWarming: boolean; warmedCount: number } {
    return {
      isWarming: this.isWarming,
      warmedCount: this.warmedImages.size
    };
  }

  /**
   * Clear warming cache
   */
  clear(): void {
    this.warmedImages.clear();
  }
}

// Export singleton instance
export const imageCacheWarmer = new ImageCacheWarmer();

// Export utility function for easy use
export const warmImageCache = (options: WarmCacheOptions) => 
  imageCacheWarmer.warmCache(options);

export default imageCacheWarmer;
