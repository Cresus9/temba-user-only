import React from 'react';
import Image from './Image';

interface PosterMediaProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  /** Aspect ratio class for the outer container, e.g. "aspect-[4/3]" */
  aspect?: string;
  /** Quality for the foreground optimized image */
  quality?: number;
  /** Foreground image width hint for the optimizer */
  width?: number;
  /** Foreground image height hint for the optimizer */
  height?: number;
  /** Eager load the foreground image */
  priority?: boolean;
  /** Extra classes for the outer container */
  className?: string;
  /** Overlays / badges placed above the poster (date pill, category chip, gradient, etc.) */
  children?: React.ReactNode;
}

/**
 * Universal poster container. Renders any image — portrait poster, landscape
 * photo, square — without cropping the subject:
 *
 *   1. A blurred + scaled copy of the image fills the entire frame as backdrop.
 *   2. The foreground image is `object-contain`, so the full subject is always
 *      visible regardless of orientation.
 *   3. Letterboxing is naturally filled by the blurred backdrop, so the card
 *      never shows ugly empty space.
 *
 * This is the pattern used by Spotify, Apple Music, Dice, and most poster-driven
 * platforms.
 */
export default function PosterMedia({
  src,
  alt,
  fallbackSrc,
  aspect = 'aspect-[4/3]',
  quality = 85,
  width = 600,
  height = 800,
  priority = false,
  className = '',
  children,
}: PosterMediaProps) {
  return (
    <div className={`relative ${aspect} overflow-hidden bg-cream-deep ${className}`}>
      {/* Blurred backdrop — fully fills the frame, color-aware */}
      {src && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center scale-[1.25] blur-3xl saturate-150"
            style={{ backgroundImage: `url(${src})` }}
          />
          {/* Soft inner shadow — gives the poster depth against the bleed */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-ink/15 via-transparent to-ink/15"
          />
        </>
      )}

      {/* Foreground — full poster, never cropped */}
      <Image
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain"
        fallbackSrc={fallbackSrc}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
      />

      {/* Slot for overlays (badges, date pills, gradient, etc.) */}
      {children}
    </div>
  );
}
