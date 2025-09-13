// Simple image preloader utility that works with the deployed image optimizer

class ImagePreloader {
  private preloadedImages = new Set<string>();
  private preloadingPromises = new Map<string, Promise<void>>();

  /**
   * Get optimized image URL using the deployed image optimizer
   */
  getOptimizedUrl(originalUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): string {
    if (!originalUrl) return '';

    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'webp'
    } = options;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const optimizerUrl = `${supabaseUrl}/functions/v1/simple-image-optimizer`;

    const params = new URLSearchParams({
      url: originalUrl,
      width: width.toString(),
      height: height.toString(),
      quality: quality.toString(),
      format
    });

    return `${optimizerUrl}?${params.toString()}`;
  }

  /**
   * Preload a single image
   */
  async preloadImage(url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): Promise<void> {
    const optimizedUrl = this.getOptimizedUrl(url, options);
    
    // Return existing promise if already preloading
    if (this.preloadingPromises.has(optimizedUrl)) {
      return this.preloadingPromises.get(optimizedUrl)!;
    }

    // Return immediately if already preloaded
    if (this.preloadedImages.has(optimizedUrl)) {
      return Promise.resolve();
    }

    const preloadPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedImages.add(optimizedUrl);
        this.preloadingPromises.delete(optimizedUrl);
        console.log('✅ Preloaded:', url);
        resolve();
      };

      img.onerror = () => {
        this.preloadingPromises.delete(optimizedUrl);
        console.warn('❌ Failed to preload:', url);
        reject(new Error(`Failed to preload image: ${url}`));
      };

      img.src = optimizedUrl;
    });

    this.preloadingPromises.set(optimizedUrl, preloadPromise);
    return preloadPromise;
  }

  /**
   * Preload multiple images in batches
   */
  async preloadImages(
    urls: string[], 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      batchSize?: number;
      delay?: number;
    } = {}
  ): Promise<{ success: number; failed: number }> {
    const { batchSize = 3, delay = 100, ...imageOptions } = options;
    let success = 0;
    let failed = 0;

    // Process images in batches
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(url => this.preloadImage(url, imageOptions))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          success++;
        } else {
          failed++;
        }
      });

      // Add delay between batches to avoid overwhelming the browser
      if (i + batchSize < urls.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success, failed };
  }

  /**
   * Preload event images with different sizes
   */
  async preloadEventImages(events: Array<{ image_url: string; title: string }>): Promise<void> {
    const imageUrls = events
      .filter(event => event.image_url)
      .map(event => event.image_url);

    if (imageUrls.length === 0) return;

    console.log(`🔄 Preloading ${imageUrls.length} event images...`);

    // Preload card-sized images (most common use case)
    const cardResults = await this.preloadImages(imageUrls, {
      width: 400,
      height: 300,
      quality: 80,
      batchSize: 3,
      delay: 100,
    });

    console.log(`✅ Event images preloaded: ${cardResults.success} success, ${cardResults.failed} failed`);

    // Preload thumbnail-sized images in background
    setTimeout(() => {
      this.preloadImages(imageUrls, {
        width: 200,
        height: 150,
        quality: 70,
        batchSize: 5,
        delay: 50,
      });
    }, 1000);
  }

  /**
   * Get preload statistics
   */
  getStats(): { preloaded: number; preloading: number } {
    return {
      preloaded: this.preloadedImages.size,
      preloading: this.preloadingPromises.size,
    };
  }

  /**
   * Clear all cached preloaded images
   */
  clear(): void {
    this.preloadedImages.clear();
    this.preloadingPromises.clear();
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}): boolean {
    const optimizedUrl = this.getOptimizedUrl(url, options);
    return this.preloadedImages.has(optimizedUrl);
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();

// Export utility functions
export const preloadEventImages = (events: Array<{ image_url: string; title: string }>) => 
  imagePreloader.preloadEventImages(events);

export const preloadImage = (url: string, options?: any) => 
  imagePreloader.preloadImage(url, options);

export const getOptimizedImageUrl = (url: string, options?: any) => 
  imagePreloader.getOptimizedUrl(url, options);

export default imagePreloader;
