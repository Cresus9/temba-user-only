import { useState } from 'react';
import DomePattern from '../design/DomePattern';
import Logo from '../brand/Logo';
import { prefersDataSaver } from '../../utils/eventDisplay';
import { flyerSrcSet, resizedImageUrl } from '../../utils/imageUrl';

export default function FlyerFrame({
  src,
  alt,
  ratio = '4/5',
  past = false,
  eager = false,
  className = '',
  sizes = '(min-width: 1440px) 290px, (min-width: 1280px) 262px, 200px',
}: {
  src?: string | null;
  alt: string;
  ratio?: '4/5' | '16/9' | '2/1';
  past?: boolean;
  eager?: boolean;
  className?: string;
  /** Rendered width hint for the browser to pick a resized flyer. */
  sizes?: string;
}) {
  const [broken, setBroken] = useState(false);
  // Resized copies first; if one fails, go back to the original file.
  const [useOriginal, setUseOriginal] = useState(false);
  const srcSet = !useOriginal ? flyerSrcSet(src) : undefined;
  const backdrop = (!useOriginal && resizedImageUrl(src, 64, 50)) || src || '';
  const [reveal, setReveal] = useState(!prefersDataSaver());
  const ratioClass = ratio === '2/1' ? 'aspect-[2/1]' : ratio === '16/9' ? 'aspect-video' : 'aspect-[4/5]';
  const show = Boolean(src) && !broken && reveal;

  return (
    <div className={`relative w-full min-w-0 overflow-hidden rounded-[10px] bg-[#1B1D33] ${ratioClass} ${className}`}>
      {show ? (
        <>
          <img
            src={backdrop}
            alt=""
            aria-hidden
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setUseOriginal(true)}
            className={`absolute -inset-[14%] h-[128%] w-[128%] object-cover blur-[18px] brightness-[.72] saturate-[1.15] ${past ? 'grayscale' : ''}`}
          />
          <img
            src={src || ''}
            srcSet={srcSet}
            sizes={srcSet ? sizes : undefined}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => (srcSet ? setUseOriginal(true) : setBroken(true))}
            className={`absolute inset-0 h-full w-full object-contain ${past ? 'grayscale brightness-95' : ''}`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand">
          <DomePattern variant="tile" />
          <Logo variant="markLight" size={36} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          {src && !reveal && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReveal(true);
              }}
              className="absolute inset-x-3 bottom-3 rounded-lg bg-white px-2 py-1.5 text-[12px] font-semibold text-ink"
            >
              Afficher l’affiche
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CardSkeleton({ width }: { width?: number }) {
  return (
    <div style={width ? { width } : undefined} className={width ? 'shrink-0' : 'w-full'}>
      <div className="aspect-[4/5] animate-pulse rounded-[10px] bg-[#ECEDF3]" />
      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#ECEDF3]" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#ECEDF3]" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#ECEDF3]" />
    </div>
  );
}
