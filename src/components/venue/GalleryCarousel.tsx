import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, Images } from 'lucide-react';

export interface CarouselImage {
  id: string;
  image_url: string;
  caption: string | null;
}

interface GalleryCarouselProps {
  images: CarouselImage[];
  /** Fallback shown when images array is empty */
  fallbackSrc?: string;
  fallbackAlt?: string;
  className?: string;
}

export default function GalleryCarousel({
  images,
  fallbackSrc,
  fallbackAlt = 'Image',
  className = '',
}: GalleryCarouselProps) {
  const [current,    setCurrent]    = useState(0);
  const [lightboxOpen, setLightbox] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If no gallery images, render the simple fallback
  if (!images.length) {
    return (
      <div className={`relative overflow-hidden bg-cream-deep ${className}`}>
        {fallbackSrc && (
          <img
            src={fallbackSrc}
            alt={fallbackAlt}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    );
  }

  const total = images.length;
  const prev  = () => setCurrent(c => (c - 1 + total) % total);
  const next  = () => setCurrent(c => (c + 1) % total);

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (lightboxOpen) {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     setLightbox(false);
    }
  }, [lightboxOpen, total]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const img = images[current];

  return (
    <>
      {/* ── Main carousel ── */}
      <div className={`relative group overflow-hidden bg-cream-deep ${className}`}>
        {/* Main image */}
        <img
          key={img.id}
          src={img.image_url}
          alt={img.caption ?? fallbackAlt}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* Caption overlay */}
        {img.caption && (
          <div className="absolute inset-x-0 bottom-0 px-4 py-3 bg-gradient-to-t from-ink/80 to-transparent pointer-events-none">
            <p className="text-[12px] text-paper/90 leading-snug">{img.caption}</p>
          </div>
        )}

        {/* Counter pill */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-ink/60 backdrop-blur-sm rounded-md">
          <Images className="w-3 h-3 text-paper/80" />
          <span className="text-[10px] font-bold text-paper tabular-nums"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            {current + 1}/{total}
          </span>
        </div>

        {/* Zoom button */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute top-3 left-3 w-8 h-8 grid place-items-center bg-ink/60 backdrop-blur-sm rounded-md text-paper opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Agrandir"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center bg-paper/80 backdrop-blur-sm rounded-full shadow-card text-ink hover:bg-paper transition-all opacity-0 group-hover:opacity-100"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center bg-paper/80 backdrop-blur-sm rounded-full shadow-card text-ink hover:bg-paper transition-all opacity-0 group-hover:opacity-100"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && total <= 12 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`pointer-events-auto rounded-full transition-all ${
                  i === current ? 'w-5 h-1.5 bg-paper' : 'w-1.5 h-1.5 bg-paper/50'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-0.5 pt-1.5">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setCurrent(i)}
              className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === current
                  ? 'border-brand shadow-card'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={im.image_url}
                alt={im.caption ?? `Photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-ink/95 backdrop-blur-sm flex flex-col items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 grid place-items-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 transition-colors z-10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-[12px] text-paper/70 tabular-nums"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            {current + 1} / {total}
          </div>

          {/* Image */}
          <div
            className="relative max-w-5xl max-h-[80vh] w-full px-14 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={img.image_url}
              alt={img.caption ?? fallbackAlt}
              className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-pop"
            />
          </div>

          {/* Caption */}
          {img.caption && (
            <p className="mt-4 text-[13px] text-paper/80 max-w-lg text-center px-4">
              {img.caption}
            </p>
          )}

          {/* Prev / Next in lightbox */}
          {total > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 transition-colors"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 transition-colors"
                aria-label="Suivant"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
