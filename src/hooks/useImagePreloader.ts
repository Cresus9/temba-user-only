import { useEffect, useState, useCallback } from 'react';
import { imageOptimizer } from '../utils/imageOptimizer';

interface PreloadItem {
  url: string;
  width?: number;
  height?: number;
  priority?: number;
  eventId?: string;
}

interface UseImagePreloaderOptions {
  enabled?: boolean;
  batchSize?: number;
  delay?: number;
}

export function useImagePreloader(
  images: PreloadItem[],
  options: UseImagePreloaderOptions = {}
) {
  const { enabled = true, batchSize = 3, delay = 100 } = options;
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const preloadImages = useCallback(async () => {
    if (!enabled || images.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);
    setErrors([]);

    try {
      // Sort images by priority (higher priority first)
      const sortedImages = [...images].sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Process images in batches
      for (let i = 0; i < sortedImages.length; i += batchSize) {
        const batch = sortedImages.slice(i, i + batchSize);

        const batchPromises = batch.map(async (item) => {
          try {
            await imageOptimizer.preloadImage(item.url, {
              width: item.width,
              height: item.height,
              quality: 80,
              format: 'webp',
            });

            // Track image access
            if (item.eventId) {
              await imageOptimizer.trackImageAccess(item.url, item.eventId, 'main');
            }

            setPreloadedCount(prev => prev + 1);
            return { success: true, url: item.url };
          } catch (error) {
            const errorMessage = `Failed to preload: ${item.url}`;
            setErrors(prev => [...prev, errorMessage]);
            return { success: false, url: item.url, error: errorMessage };
          }
        });

        await Promise.allSettled(batchPromises);

        // Add delay between batches to avoid overwhelming the browser
        if (i + batchSize < sortedImages.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('Error in image preloading:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [images, enabled, batchSize, delay]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  return {
    preloadedCount,
    totalImages: images.length,
    isPreloading,
    errors,
    progress: images.length > 0 ? (preloadedCount / images.length) * 100 : 0,
    retry: preloadImages,
  };
}

// Hook for preloading event images specifically
export function useEventImagePreloader(events: Array<{ id: string; image_url: string; title: string }>) {
  const images: PreloadItem[] = events.map((event, index) => ({
    url: event.image_url,
    width: 400,
    height: 300,
    priority: events.length - index, // First events have higher priority
    eventId: event.id,
  }));

  return useImagePreloader(images, {
    enabled: true,
    batchSize: 3,
    delay: 100,
  });
}

// Hook for preloading critical images on app start
export function useCriticalImagePreloader() {
  const [criticalImages, setCriticalImages] = useState<PreloadItem[]>([]);

  const addCriticalImage = useCallback((url: string, options: Partial<PreloadItem> = {}) => {
    setCriticalImages(prev => [
      ...prev,
      {
        url,
        width: 400,
        height: 300,
        priority: 10,
        ...options,
      }
    ]);
  }, []);

  const clearCriticalImages = useCallback(() => {
    setCriticalImages([]);
  }, []);

  const preloadResult = useImagePreloader(criticalImages, {
    enabled: true,
    batchSize: 5, // Higher batch size for critical images
    delay: 50, // Shorter delay for critical images
  });

  return {
    ...preloadResult,
    addCriticalImage,
    clearCriticalImages,
  };
}

// Hook for progressive image loading based on viewport
export function useProgressiveImageLoader(
  allImages: PreloadItem[],
  visibleCount: number = 6
) {
  const [currentBatch, setCurrentBatch] = useState(0);
  const batchSize = visibleCount;

  const currentImages = allImages.slice(0, (currentBatch + 1) * batchSize);
  
  const preloadResult = useImagePreloader(currentImages, {
    enabled: true,
    batchSize: 3,
    delay: 100,
  });

  const loadNextBatch = useCallback(() => {
    if ((currentBatch + 1) * batchSize < allImages.length) {
      setCurrentBatch(prev => prev + 1);
    }
  }, [currentBatch, batchSize, allImages.length]);

  const hasMoreBatches = (currentBatch + 1) * batchSize < allImages.length;

  return {
    ...preloadResult,
    loadNextBatch,
    hasMoreBatches,
    currentBatch,
    visibleImages: currentImages,
  };
}
