import { useState } from 'react';
import { flyerSrcSet, resizedImageUrl } from '../../utils/imageUrl';
import { initials } from '../../utils/artistPage';

interface ArtistImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Width in CSS pixels the picture is shown at, used for `sizes` and the fallback size. */
  sizes: string;
  width: number;
  height: number;
  /** The hero picture is the LCP image: loaded first. Everything else is lazy. */
  priority?: boolean;
  grayscale?: boolean;
}

/** Responsive, lazy picture with the original URL as fallback if a resized copy fails. */
export function ArtistImage({ src, alt, className = '', sizes, width, height, priority = false, grayscale = false }: ArtistImageProps) {
  const [broken, setBroken] = useState(false);
  const [resizedFailed, setResizedFailed] = useState(false);
  if (broken) return null;
  const srcSet = resizedFailed ? undefined : flyerSrcSet(src);
  const first = resizedFailed ? null : resizedImageUrl(src, 480);
  return (
    <img
      src={first || src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
      referrerPolicy="no-referrer"
      onError={() => (srcSet ? setResizedFailed(true) : setBroken(true))}
      className={`${className} ${grayscale ? 'grayscale' : ''}`}
    />
  );
}

/** Portrait of an artist, or an initials tile when the database has no usable photo. */
export function ArtistPortrait({
  name,
  photo,
  className = '',
  sizes,
  width = 480,
  height = 480,
  priority = false,
}: {
  name: string;
  photo: string;
  className?: string;
  sizes: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  if (!photo) {
    return (
      <div role="img" aria-label={name} className={`flex items-center justify-center bg-ink-800 ${className}`}>
        <span className="font-artist text-[64px] font-extrabold leading-none text-white/40">{initials(name)}</span>
      </div>
    );
  }
  return (
    <ArtistImage
      src={photo}
      alt={`${name}, portrait`}
      sizes={sizes}
      width={width}
      height={height}
      priority={priority}
      className={`object-cover object-[50%_25%] ${className}`}
    />
  );
}
