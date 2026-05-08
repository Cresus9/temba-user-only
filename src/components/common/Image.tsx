import React, { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
}

// If the Supabase image optimizer hasn't responded within this window we silently
// fall back to the original URL. Keeps the UI from stalling on a broken / slow
// edge function — a frequent issue in dev or on cold-starts.
const OPTIMIZER_TIMEOUT_MS = 1500;

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
  const [isInView, setIsInView] = useState(priority);
  const [optimizerTried, setOptimizerTried] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const getOptimizedUrl = (originalUrl: string) => {
    if (!originalUrl) return '';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // No Supabase URL configured, or the URL is already an optimizer/data URL — use original.
    if (!supabaseUrl || originalUrl.startsWith('data:') || originalUrl.includes('/functions/v1/')) {
      return originalUrl;
    }

    const optimizerUrl = `${supabaseUrl}/functions/v1/simple-image-optimizer`;
    const params = new URLSearchParams({
      url: originalUrl,
      width: width.toString(),
      height: height.toString(),
      quality: quality.toString(),
      format: 'webp',
    });

    return `${optimizerUrl}?${params.toString()}`;
  };

  // Lazy load via IntersectionObserver
  useEffect(() => {
    if (priority || isInView) return;
    if (!wrapperRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '120px', threshold: 0.01 }
    );

    observer.observe(wrapperRef.current);
    observerRef.current = observer;

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, isInView]);

  // First load: try optimized URL
  useEffect(() => {
    if (!src || !isInView) return;
    setOptimizerTried(false);
    setImageSrc(getOptimizedUrl(src));
    setIsLoading(true);
    setHasError(false);
  }, [src, isInView, width, height, quality]);

  // Optimizer timeout fallback: if the optimized URL hasn't loaded in OPTIMIZER_TIMEOUT_MS,
  // swap to the direct URL so the user actually sees the image.
  useEffect(() => {
    if (!isLoading || !imageSrc || optimizerTried) return;
    if (!src || imageSrc === src) return;

    timeoutRef.current = window.setTimeout(() => {
      setOptimizerTried(true);
      setImageSrc(src);
    }, OPTIMIZER_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [imageSrc, isLoading, optimizerTried, src]);

  const handleImageLoad = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 1. Try direct (original) src if we haven't yet
    if (src && imageSrc !== src) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
      setOptimizerTried(true);
      return;
    }

    // 2. Try the fallback (direct, no optimizer)
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setIsLoading(true);
      setHasError(false);
      return;
    }

    setIsLoading(false);
    setHasError(true);
  };

  // Pre-load placeholder
  if (!isInView) {
    return (
      <div
        ref={wrapperRef}
        className={`bg-cream-deep ${className ?? ''}`}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  // Hard error
  if (hasError) {
    return (
      <div className={`bg-cream-deep flex items-center justify-center ${className ?? ''}`}>
        <ImageOff className="h-7 w-7 text-ink-mute opacity-60" />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="contents">
      {/* Warm shimmer placeholder while loading */}
      {isLoading && (
        <div
          className={`absolute inset-0 bg-cream-deep ${className ?? ''}`}
          aria-hidden
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-paper/60 to-transparent" />
        </div>
      )}

      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`${className ?? ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}