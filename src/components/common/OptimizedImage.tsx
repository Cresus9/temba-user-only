import React, { useState, useEffect, useRef } from 'react';
import { imageOptimizer } from '../../utils/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  eventId?: string;
  imageType?: 'main' | 'banner' | 'gallery' | 'thumbnail';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  lazy?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'webp',
  className = '',
  fallbackSrc,
  priority = false,
  eventId,
  imageType = 'main',
  onLoad,
  onError,
  lazy = true,
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority, isInView]);

  // Generate optimized URL when component mounts or src changes
  useEffect(() => {
    if (!src || !isInView) return;

    const optimizedUrl = imageOptimizer.getOptimizedUrl(src, {
      width,
      height,
      quality,
      format,
    });

    setCurrentSrc(optimizedUrl);
    setIsLoading(true);
    setHasError(false);

    // Track image access for analytics
    if (eventId) {
      imageOptimizer.trackImageAccess(src, eventId, imageType);
    }
  }, [src, width, height, quality, format, isInView, eventId, imageType]);

  // Preload high priority images
  useEffect(() => {
    if (priority && src && isInView) {
      imageOptimizer.preloadImage(src, { width, height, quality, format })
        .catch(error => {
          console.warn('Failed to preload priority image:', error);
        });
    }
  }, [src, priority, width, height, quality, format, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);

    // Try fallback image if available
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      const fallbackOptimized = imageOptimizer.getOptimizedUrl(fallbackSrc, {
        width,
        height,
        quality,
        format,
      });
      setCurrentSrc(fallbackOptimized);
      setHasError(false);
      setIsLoading(true);
      return;
    }

    // Try original image as last resort
    if (currentSrc !== src) {
      setCurrentSrc(src);
      setHasError(false);
      setIsLoading(true);
      return;
    }

    onError?.(new Error(`Failed to load image: ${src}`));
  };

  // Don't render anything if not in view and lazy loading
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse rounded"
          aria-label={`Loading ${alt}`}
        />
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded"
          style={{ width, height }}
        >
          <div className="text-center text-gray-400">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Image non disponible</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 rounded`}
          style={{ width, height, objectFit: 'cover' }}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Priority indicator (for development) */}
      {priority && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
          P
        </div>
      )}
    </div>
  );
}
