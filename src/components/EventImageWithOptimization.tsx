import React, { useState, useEffect, useRef } from 'react';

interface EventImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function EventImageWithOptimization({
  src,
  alt,
  width = 800,
  height = 600,
  quality = 80,
  className = '',
  priority = false,
  onLoad,
  onError,
}: EventImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Get optimized image URL
  const getOptimizedUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const optimizerUrl = `${supabaseUrl}/functions/v1/image-optimizer`;
    
    const params = new URLSearchParams({
      url: originalUrl,
      width: width.toString(),
      height: height.toString(),
      quality: quality.toString(),
      format: 'webp'
    });
    
    return `${optimizerUrl}?${params.toString()}`;
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

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
        rootMargin: '100px', // Start loading 100px before image comes into view
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
  }, [priority, isInView]);

  // Set image source when in view
  useEffect(() => {
    if (!src || !isInView) return;

    const optimizedUrl = getOptimizedUrl(src);
    setImageSrc(optimizedUrl);
  }, [src, isInView, width, height, quality]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    
    // Try original image as fallback
    if (imageSrc !== src) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
      return;
    }
    
    setHasError(true);
    onError?.();
  };

  // Show placeholder when not in view
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
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

      {/* Optimized image */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 w-full h-full object-cover rounded`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  );
}
