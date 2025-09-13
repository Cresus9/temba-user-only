import { useEffect, useState, useCallback } from 'react';

interface Event {
  id: string;
  image_url: string;
  title: string;
}

interface PreloadStats {
  total: number;
  loaded: number;
  failed: number;
  isLoading: boolean;
}

export function useEventImagePreloader(events: Event[]) {
  const [stats, setStats] = useState<PreloadStats>({
    total: 0,
    loaded: 0,
    failed: 0,
    isLoading: false,
  });

  const getOptimizedUrl = useCallback((originalUrl: string, width = 400, height = 300) => {
    if (!originalUrl) return '';
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const optimizerUrl = `${supabaseUrl}/functions/v1/image-optimizer`;
    
    const params = new URLSearchParams({
      url: originalUrl,
      width: width.toString(),
      height: height.toString(),
      quality: '80',
      format: 'webp'
    });
    
    return `${optimizerUrl}?${params.toString()}`;
  }, []);

  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setStats(prev => ({ ...prev, loaded: prev.loaded + 1 }));
        resolve();
      };
      
      img.onerror = () => {
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        reject(new Error(`Failed to preload: ${url}`));
      };
      
      img.src = url;
    });
  }, []);

  const preloadEventImages = useCallback(async () => {
    if (!events || events.length === 0) return;

    setStats({
      total: events.length,
      loaded: 0,
      failed: 0,
      isLoading: true,
    });

    // Preload images in batches to avoid overwhelming the browser
    const batchSize = 3;
    const delay = 200; // ms between batches

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (event) => {
        try {
          const optimizedUrl = getOptimizedUrl(event.image_url);
          await preloadImage(optimizedUrl);
        } catch (error) {
          console.warn(`Failed to preload image for event ${event.title}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add delay between batches
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setStats(prev => ({ ...prev, isLoading: false }));
  }, [events, getOptimizedUrl, preloadImage]);

  useEffect(() => {
    preloadEventImages();
  }, [preloadEventImages]);

  return {
    ...stats,
    progress: stats.total > 0 ? ((stats.loaded + stats.failed) / stats.total) * 100 : 0,
    successRate: stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0,
    retry: preloadEventImages,
  };
}

// Hook for preloading critical images on page load
export function useCriticalImagePreloader() {
  const [criticalImages, setCriticalImages] = useState<string[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);

  const getOptimizedUrl = useCallback((originalUrl: string, width = 800, height = 600) => {
    if (!originalUrl) return '';
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const optimizerUrl = `${supabaseUrl}/functions/v1/image-optimizer`;
    
    const params = new URLSearchParams({
      url: originalUrl,
      width: width.toString(),
      height: height.toString(),
      quality: '85',
      format: 'webp'
    });
    
    return `${optimizerUrl}?${params.toString()}`;
  }, []);

  const addCriticalImage = useCallback((url: string) => {
    setCriticalImages(prev => [...prev, url]);
  }, []);

  const preloadCriticalImages = useCallback(async () => {
    if (criticalImages.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);

    for (const imageUrl of criticalImages) {
      try {
        const optimizedUrl = getOptimizedUrl(imageUrl);
        
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            setPreloadedCount(prev => prev + 1);
            resolve();
          };
          img.onerror = () => reject(new Error(`Failed to preload: ${imageUrl}`));
          img.src = optimizedUrl;
        });
      } catch (error) {
        console.warn('Failed to preload critical image:', error);
      }
    }

    setIsPreloading(false);
  }, [criticalImages, getOptimizedUrl]);

  useEffect(() => {
    preloadCriticalImages();
  }, [preloadCriticalImages]);

  return {
    addCriticalImage,
    isPreloading,
    preloadedCount,
    totalCritical: criticalImages.length,
  };
}
