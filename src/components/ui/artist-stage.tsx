import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import TopologyField from './topology-field';

type ArtistStageProps = {
  children?: React.ReactNode;
  className?: string;
  watermark?: string;
};

export function ArtistStage({ children, className, watermark }: ArtistStageProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const noiseId = `artist-noise-${rawId}`;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundColor: '#000000' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
        <TopologyField className="h-full w-full" mode="dark" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[min(58%,620px)]"
        style={{
          background:
            'linear-gradient(90deg, #000 0%, rgba(0,0,0,0.72) 42%, transparent 100%)',
        }}
      />

      {watermark ? (
        <p
          aria-hidden
          className="pointer-events-none absolute -right-4 bottom-[-0.18em] z-[1] select-none font-semibold leading-[0.78] tracking-[-0.06em] text-white/[0.028] uppercase"
          style={{
            fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
            fontSize: 'clamp(72px, 16vw, 200px)',
          }}
        >
          {watermark}
        </p>
      ) : null}

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-[0.07] mix-blend-overlay"
      >
        <filter id={noiseId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
      </svg>

      <span aria-hidden className="pointer-events-none absolute left-4 top-4 z-[2] h-3 w-3 border-l border-t border-white/15 sm:left-6 sm:top-6" />
      <span aria-hidden className="pointer-events-none absolute right-4 top-4 z-[2] h-3 w-3 border-r border-t border-white/15 sm:right-6 sm:top-6" />
      <span aria-hidden className="pointer-events-none absolute bottom-4 left-4 z-[2] h-3 w-3 border-b border-l border-white/15 sm:bottom-6 sm:left-6" />
      <span aria-hidden className="pointer-events-none absolute bottom-4 right-4 z-[2] h-3 w-3 border-b border-r border-white/15 sm:bottom-6 sm:right-6" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 bottom-0 z-[2] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent sm:inset-x-16"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default ArtistStage;
