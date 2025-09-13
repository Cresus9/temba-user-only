import React, { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
}

export default function Image({ 
  src, 
  alt, 
  className, 
  fallbackSrc, 
  width = 400, 
  height = 300, 
  quality = 80, 
  priority = false,
  ...props 
}: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Smart loading based on priority
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Get optimized image URL - using original URLs for now (reliable)
  const getOptimizedUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    
    // Use original URLs since they're working perfectly
    // This gives us reliability without the complexity of optimization
    return originalUrl;
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
  };

  const handleImageError = () => {
    setIsLoading(false);
    
    // Try fallback first, then original image
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      const optimizedFallback = getOptimizedUrl(fallbackSrc);
      setImageSrc(optimizedFallback);
      setIsLoading(true);
      setHasError(false);
      return;
    }
    
    // Try original image as last resort
    if (imageSrc !== src) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
      return;
    }
    
    setHasError(true);
  };

  // Show placeholder when not in view or loading
  if (!isInView || (isLoading && !imageSrc)) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  // Show error state
  if (hasError && !isLoading) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <ImageOff className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Loading skeleton */}
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`} />
      )}

      {/* Optimized image */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      )}
    </>
  );
}