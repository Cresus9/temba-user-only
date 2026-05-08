import React from 'react';

interface LogoProps {
  /**
   * Visual variant.
   * - `auto` (default): brand-blue mark + ink wordmark (for light surfaces).
   * - `light`: brand-blue mark + paper-white wordmark (for dark surfaces).
   * - `mark`: just the mark, no wordmark.
   */
  variant?: 'auto' | 'light' | 'mark';
  /** Visual height of the mark, in px. Wordmark scales relative to this. */
  size?: number;
  className?: string;
  /** Override the wordmark text color. */
  wordmarkClassName?: string;
}

/**
 * Temba brand lockup. The mark is rendered as inline SVG so it's crisp at
 * any size and color. The wordmark uses our display font so it always pairs
 * cleanly with the surrounding typography.
 */
export default function Logo({
  variant = 'auto',
  size = 32,
  className = '',
  wordmarkClassName,
}: LogoProps) {
  const wordmarkColor =
    wordmarkClassName ??
    (variant === 'light' ? 'text-paper' : 'text-ink');

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      {variant !== 'mark' && (
        <span
          className={`font-extrabold tracking-[0.04em] leading-none ${wordmarkColor}`}
          style={{
            fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
            fontSize: `${Math.round(size * 0.62)}px`,
          }}
        >
          TEMBA
        </span>
      )}
    </span>
  );
}

/**
 * The mark on its own — outer frame + inner solid square + "T" cutout.
 * Uses real brand color so it works on cream, paper, and ink surfaces.
 */
function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Temba"
      className="flex-shrink-0"
    >
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="1"
        stroke="#4D4FE6"
        strokeWidth="2"
      />
      <rect x="14" y="14" width="36" height="36" fill="#4D4FE6" />
      <rect x="18" y="20" width="28" height="5" fill="#FFFFFF" />
      <rect x="29" y="20" width="6" height="22" fill="#FFFFFF" />
    </svg>
  );
}
